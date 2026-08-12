/**
 * Classificação de extratos/faturas via Claude (Anthropic API).
 *
 * Substitui a antiga abordagem de parsers por banco (regex frágil, sem
 * suporte a Caixa/Santander/BB, perdendo o sinal débito/crédito em vários
 * bancos — ver client/src/lib/bankDetection.ts). Em vez de tentar adivinhar
 * o formato do extrato com expressões regulares, mandamos o documento
 * (PDF nativo, ou texto já extraído para CSV/XLSX/OFX) direto pro modelo,
 * que devolve as transações já estruturadas e já classificadas.
 *
 * A IA também identifica o próprio documento (banco, bandeira, últimos 4
 * dígitos, titular) — isso permite a importação "inteligente" (Importar.tsx)
 * detectar sozinha qual cartão/conta cadastrado corresponde ao arquivo, sem
 * a pessoa precisar escolher antes de subir o PDF (ver db.detectEntityFromDocument).
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const TransactionSchema = z.object({
  date: z.string().describe("Data da transação no formato YYYY-MM-DD"),
  description: z.string().describe("Descrição da transação, limpa"),
  amount: z.string().describe("Valor absoluto (sempre positivo), com 2 casas decimais, ex: 45.90"),
  type: z.enum(["income", "expense"]).describe(
    "income = entrada de dinheiro (receita, depósito, estorno/crédito); expense = saída (despesa, compra, pagamento)"
  ),
  installments: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe(
      "Número TOTAL de parcelas da compra, lido diretamente da notação impressa na fatura (ex: '03/10' = 10 parcelas ao todo). Se a compra não é parcelada (à vista, crédito/estorno, pagamento, anuidade em parcela única), use 1."
    ),
  currentInstallment: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe(
      "Número da parcela sendo cobrada NESTA fatura, lido da mesma notação (ex: '03/10' = parcela 3). Se não é parcelada, use 1."
    ),
  categoryId: z.number().nullable().describe("id da categoria mais adequada, ou null se não tiver certeza"),
  confidence: z.enum(["high", "medium", "low"]),
});

// Metadados do próprio documento — usados pra descobrir automaticamente a
// qual cartão/conta cadastrado essa fatura/extrato pertence, sem a pessoa
// ter que escolher manualmente antes de subir o arquivo.
const DocumentMetaSchema = z.object({
  documentType: z
    .enum(["creditCardInvoice", "bankStatement", "unknown"])
    .describe("Tipo do documento: fatura de cartão de crédito, extrato de conta bancária, ou não deu pra identificar"),
  issuerBank: z
    .string()
    .nullable()
    .describe('Banco ou emissor impresso no documento, ex: "Itaú", "Bradesco", "Nubank"'),
  cardBrand: z
    .string()
    .nullable()
    .describe('Bandeira do cartão impressa no documento, ex: "Visa", "Mastercard", "Elo" — null se for extrato de conta'),
  cardProductName: z
    .string()
    .nullable()
    .describe('Nome do produto do cartão, ex: "Visa Infinite", "Mastercard Black" — null se não houver ou for extrato de conta'),
  cardLastFourDigits: z
    .string()
    .nullable()
    .describe("Últimos 4 dígitos do número do cartão titular (não de cartões adicionais), ex: \"8631\" — null se não aparecer ou for extrato de conta"),
  accountNumber: z
    .string()
    .nullable()
    .describe("Número da conta bancária (com ou sem dígito), se for extrato de conta — null caso contrário"),
  cardholderName: z.string().nullable().describe("Nome do titular impresso no documento"),
});

const ClassificationResultSchema = z.object({
  document: DocumentMetaSchema,
  transactions: z.array(TransactionSchema),
});

export type AIClassifiedTransaction = z.infer<typeof TransactionSchema>;
export type DocumentMeta = z.infer<typeof DocumentMetaSchema>;

export interface CategoryOption {
  id: number;
  name: string;
  type: "income" | "expense";
}

export interface HistoricalExample {
  description: string;
  categoryId: number;
}

function buildInstructions(params: {
  entityType?: "bankAccount" | "creditCard";
  categories: CategoryOption[];
  historicalExamples: HistoricalExample[];
}): string {
  // entityType conhecido (fluxo antigo, quem chama já sabe se é fatura ou
  // extrato porque a pessoa escolheu o cartão/conta antes de subir o
  // arquivo) vs. desconhecido (fluxo novo "Importar" — a própria IA precisa
  // descobrir, a partir do documento, se é fatura de cartão ou extrato).
  const knownType = params.entityType;
  const isCard = knownType === "creditCard";
  const isBank = knownType === "bankAccount";

  const categoryList = params.categories
    .map((c) => `- id ${c.id}: "${c.name}" (${c.type === "income" ? "receita" : "despesa"})`)
    .join("\n");

  const examplesList =
    params.historicalExamples.length > 0
      ? params.historicalExamples
          .slice(0, 80)
          .map((e) => `- "${e.description}" → categoria id ${e.categoryId}`)
          .join("\n")
      : "(sem histórico ainda — use seu melhor julgamento pela descrição)";

  const cardStructureNotes = `

ESTRUTURA DE FATURA DE CARTÃO (se o documento for uma fatura de cartão de crédito — importante: a fatura já vem organizada em seções, use os títulos impressos como sinal forte, não só o valor):
- Faturas de cartão brasileiras normalmente separam as transações em blocos/seções com títulos como "Compras" / "Lançamentos do mês" / "Compras à vista" (compras feitas dentro do próprio ciclo, cobradas em parcela única), "Parcelamentos" / "Compras parceladas" / "Compras a prazo" (compras cobradas em várias faturas) e "Créditos" / "Estornos" / "Pagamentos e créditos" (dinheiro voltando para o cliente: estorno de compra, cashback, contestação). Use esses cabeçalhos de seção para decidir installments/currentInstallment e type — eles costumam estar explicitamente escritos no documento.
- Notação de parcela: quando a descrição traz algo como "03/10", "PARC 02/06", "2 de 12", isso é currentInstallment/installments — extraia os dois números exatamente como aparecem, não invente.
- Estornos/créditos às vezes vêm com um "-" na frente do valor, mas em várias faturas eles só ficam claros pela seção em que estão ou por palavras como "ESTORNO", "CRÉDITO", "CASHBACK", "CANCELAMENTO", "DEVOLUÇÃO" — mesmo sem sinal negativo explícito, classifique como type "income" (é dinheiro voltando).
- Uma compra parcelada é type "expense" mesmo que installments > 1 — parcelamento não é crédito, é despesa dividida em várias faturas.
- Ignore "pagamento efetuado"/"pagamento recebido" no topo da fatura — isso é o pagamento da própria fatura anterior, não uma compra.`;

  const documentIdNotes = `

IDENTIFICAÇÃO DO DOCUMENTO (campo "document" — preencha sempre, mesmo no fluxo em que o tipo já é conhecido):
- documentType: "creditCardInvoice" se for fatura de cartão de crédito, "bankStatement" se for extrato de conta bancária, "unknown" só se genuinamente não der pra saber.
- issuerBank: nome do banco/emissor impresso (ex: "Itaú", "Bradesco", "Nubank", "Banco do Brasil").
- cardBrand e cardProductName: bandeira e nome do produto do cartão (ex: "Mastercard" / "Mastercard Black"), lidos do cabeçalho da fatura — null se for extrato de conta.
- cardLastFourDigits: os 4 últimos dígitos do cartão DO TITULAR impressos na fatura (geralmente no formato "XXXX.XXXX.XXXX.1234") — null se não aparecer ou for extrato de conta. NÃO confunda com os "finais" de cartões adicionais listados dentro da fatura.
- accountNumber: número da conta bancária impresso no extrato — null se for fatura de cartão.
- cardholderName: nome do titular impresso no documento.`;

  const typeInstruction = isCard
    ? `Você vai analisar uma fatura de cartão de crédito e extrair cada transação real encontrada no documento.`
    : isBank
    ? `Você vai analisar um extrato bancário e extrair cada transação real encontrada no documento.`
    : `Você vai analisar um documento financeiro (pode ser fatura de cartão de crédito OU extrato de conta bancária — descubra qual pelo layout e preencha "documentType" de acordo) e extrair cada transação real encontrada.`;

  return `${typeInstruction}

Para CADA transação, retorne:
- date: data no formato YYYY-MM-DD (use o ano correto do extrato, não assuma o ano atual)
- description: a descrição da transação, limpa (sem lixo de formatação, sem repetir a data ou o valor)
- amount: valor ABSOLUTO (sempre positivo), com 2 casas decimais
- type: "income" se é ENTRADA de dinheiro (receita, estorno/crédito na fatura, depósito, transferência recebida) ou "expense" se é SAÍDA (despesa, compra à vista ou parcelada, pagamento, saque, transferência enviada)
- installments: número TOTAL de parcelas da compra, lido da notação impressa (ex: "03/10" → 10). Se não for fatura de cartão, ou a compra for à vista/crédito/pagamento, use 1.
- currentInstallment: número da parcela cobrada NESTA fatura (ex: "03/10" → 3). Se não é parcelada = 1.
- categoryId: o id da categoria mais adequada da lista abaixo, baseado na descrição e no histórico de categorização já feito por esta pessoa. Se não tiver nenhuma certeza razoável, use null — não force uma categoria errada.
- confidence: "high", "medium" ou "low" — sua confiança na categoria escolhida

IGNORE linhas que não são transações reais: saldo anterior, saldo do dia, limite disponível, totais, subtotais de seção, cabeçalhos de tabela.
${cardStructureNotes}
${documentIdNotes}

Categorias disponíveis:
${categoryList}

Histórico de transações já categorizadas por esta pessoa (use como referência de padrão — descrições parecidas ou do mesmo estabelecimento tendem a ir na mesma categoria):
${examplesList}

Retorne TODAS as transações encontradas no documento, na ordem em que aparecem no extrato.`;
}

export async function classifyStatementWithAI(params: {
  // Quando informado (fluxo legado /cartoes/:id/importar e /contas/:id/importar,
  // onde a pessoa já escolheu o cartão/conta antes de subir o arquivo), o
  // prompt é mais específico. Quando omitido (fluxo novo "Importar" — ver
  // Importar.tsx), a própria IA identifica o tipo de documento a partir do
  // conteúdo, e o resultado inclui "document" pra permitir detecção
  // automática do cartão/conta (db.detectEntityFromDocument).
  entityType?: "bankAccount" | "creditCard";
  fileName: string;
  pdfBase64?: string;
  textContent?: string;
  categories: CategoryOption[];
  historicalExamples: HistoricalExample[];
}): Promise<{ document: DocumentMeta; transactions: AIClassifiedTransaction[] }> {
  if (!params.pdfBase64 && !params.textContent) {
    throw new Error("Nenhum conteúdo de arquivo fornecido para classificação");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada no servidor. Configure essa variável de ambiente para usar a classificação automática por IA."
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const instructions = buildInstructions(params);

  const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

  if (params.pdfBase64) {
    contentBlocks.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: params.pdfBase64,
      },
    });
    contentBlocks.push({ type: "text", text: instructions });
  } else {
    contentBlocks.push({
      type: "text",
      text: `${instructions}\n\n--- CONTEÚDO DO ARQUIVO (${params.fileName}) ---\n${params.textContent}`,
    });
  }

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    output_config: {
      format: zodOutputFormat(ClassificationResultSchema),
    },
    messages: [{ role: "user", content: contentBlocks }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("A IA recusou processar este arquivo. Tente importar manualmente.");
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock => block.type === "text"
  );
  if (!textBlock) {
    throw new Error("A IA não retornou nenhum conteúdo utilizável. Tente novamente.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(textBlock.text);
  } catch {
    throw new Error("Resposta da IA não veio em formato válido. Tente novamente.");
  }

  return ClassificationResultSchema.parse(parsedJson);
}
