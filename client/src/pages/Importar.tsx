"use client";

import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Banknote,
  CreditCard,
  Upload,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  FileQuestion,
} from "lucide-react";
import { toast } from "sonner";
import { readFileForClassification, ACCEPTED_IMPORT_EXTENSIONS } from "@/lib/fileConversion";
import { setPendingImport } from "@/lib/importHandoff";

type EntityChoice = { entityType: "creditCard" | "bankAccount"; entityId: number } | null;

type ClassifyOutput = Awaited<ReturnType<ReturnType<typeof trpc.files.classifyWithAI.useMutation>["mutateAsync"]>>;

interface QueuedFile {
  key: string;
  fileName: string;
  status: "processing" | "done" | "error";
  error?: string;
  result?: ClassifyOutput;
  // Escolha manual, quando a detecção automática não achou um cartão/conta
  // confiável — a pessoa confirma uma vez, antes de importar.
  manualChoice?: EntityChoice;
}

function summarize(result: ClassifyOutput) {
  const isCard = result.document.documentType === "creditCardInvoice";
  const porRegra = result.transactions.filter((t) => t.categorySource === "rule").length;
  const total = result.transactions.length;

  // Extrato de conta: à vista/parcelada/crédito não se aplicam — o que
  // importa lá é receita vs. despesa. Fatura de cartão: as 3 categorias que
  // a pessoa pediu pra separar.
  const receitas = !isCard ? result.transactions.filter((t) => t.type === "income").length : 0;
  const despesas = !isCard ? total - receitas : 0;
  const creditos = isCard ? result.transactions.filter((t) => t.type === "income").length : 0;
  const parcelas = isCard ? result.transactions.filter((t) => t.type !== "income" && (t.installments ?? 1) > 1).length : 0;
  const vista = isCard ? total - creditos - parcelas : 0;

  return { isCard, creditos, parcelas, vista, receitas, despesas, porRegra, total };
}

export default function Importar() {
  const [, navigate] = useLocation();
  const accountsQuery = trpc.bankAccounts.list.useQuery();
  const cardsQuery = trpc.creditCards.list.useQuery();
  const classifyMutation = trpc.files.classifyWithAI.useMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<QueuedFile[]>([]);

  const processFile = async (file: File) => {
    const key = `${file.name}-${Date.now()}-${Math.random()}`;
    setQueue((prev) => [...prev, { key, fileName: file.name, status: "processing" }]);

    try {
      const { pdfBase64, textContent } = await readFileForClassification(file);
      // Sem entityType: a própria IA identifica se é fatura de cartão ou
      // extrato de conta, e o servidor tenta casar com um cartão/conta já
      // cadastrado (ver server/db.ts detectEntityFromDocument).
      const result = await classifyMutation.mutateAsync({
        fileName: file.name,
        pdfBase64,
        textContent,
      });
      // Detecção "low" é um palpite (ex: só existe um cartão dessa bandeira
      // cadastrado) — pré-preenche a escolha, mas continua exigindo
      // confirmação explícita, igual a quando não detecta nada.
      const prefill =
        result.detectedEntity && result.detectedEntity.confidence === "low"
          ? { entityType: result.detectedEntity.entityType, entityId: result.detectedEntity.entityId }
          : undefined;
      setQueue((prev) =>
        prev.map((q) => (q.key === key ? { ...q, status: "done", result, manualChoice: prefill } : q))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setQueue((prev) => prev.map((q) => (q.key === key ? { ...q, status: "error", error: message } : q)));
    }
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    for (const file of files) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED_IMPORT_EXTENSIONS.includes(ext)) {
        toast.error(`${file.name}: formato não aceito (PDF, OFX, TXT, XLSX, XLS ou CSV)`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: arquivo maior que 10MB`);
        continue;
      }
      void processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  };

  const setManualChoice = (key: string, choice: EntityChoice) => {
    setQueue((prev) => prev.map((q) => (q.key === key ? { ...q, manualChoice: choice } : q)));
  };

  const removeFromQueue = (key: string) => {
    setQueue((prev) => prev.filter((q) => q.key !== key));
  };

  const goReview = (item: QueuedFile) => {
    if (!item.result) return;
    // A escolha manual (que inclui a confirmação de um palpite "low"
    // confidence) sempre manda mais que a detecção automática — só usamos
    // a detecção direto quando ela já veio "high" confidence e a pessoa não
    // mexeu em nada.
    const entity = item.manualChoice
      ?? (item.result.detectedEntity?.confidence === "high"
        ? { entityType: item.result.detectedEntity.entityType, entityId: item.result.detectedEntity.entityId }
        : null);
    if (!entity) {
      toast.error("Escolha o cartão ou a conta antes de revisar essa fatura");
      return;
    }

    setPendingImport({
      fileName: item.fileName,
      document: item.result.document,
      transactions: item.result.transactions,
    });
    navigate(
      entity.entityType === "creditCard" ? `/cartoes/${entity.entityId}/importar` : `/contas/${entity.entityId}/importar`
    );
  };

  const cards = cardsQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-purple-600" />
            Importação Inteligente
          </h1>
          <p className="text-muted-foreground mt-1">
            Solte a fatura ou o extrato (PDF, CSV, XLSX ou OFX) aqui embaixo — pode soltar vários de uma vez. A IA lê
            cada arquivo, descobre sozinha qual cartão ou conta é, separa à vista, parcelado e crédito/estorno, e
            aplica suas regras de categorização antes de qualquer coisa.
          </p>
        </div>

        {/* Dropzone */}
        <Card
          className="p-8 border-2 border-dashed text-center hover:border-primary hover:bg-muted/30 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.ofx,.txt,.xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />
          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Arraste os arquivos aqui, ou clique para escolher</p>
          <p className="text-sm text-muted-foreground mt-1">PDF, XLSX, XLS, CSV, OFX, TXT · até 10MB cada</p>
        </Card>

        {/* Fila de arquivos sendo processados/revisados */}
        {queue.length > 0 && (
          <div className="space-y-3">
            {queue.map((item) => (
              <QueueCard
                key={item.key}
                item={item}
                cards={cards}
                accounts={accounts}
                onChooseEntity={(choice) => setManualChoice(item.key, choice)}
                onReview={() => goReview(item)}
                onRemove={() => removeFromQueue(item.key)}
              />
            ))}
          </div>
        )}

        {/* Fallback: importar manualmente escolhendo o cartão/conta primeiro */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
            Prefere escolher o cartão ou a conta antes de subir o arquivo?
          </summary>
          <div className="mt-4 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                Contas Bancárias
              </h2>
              {accountsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta cadastrada ainda.{" "}
                  <button className="underline" onClick={() => navigate("/contas")}>
                    Cadastrar uma conta
                  </button>
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {accounts.map((account: { id: number; name: string; bank: string; color: string }) => (
                    <button
                      key={account.id}
                      onClick={() => navigate(`/contas/${account.id}/importar`)}
                      className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: account.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{account.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{account.bank}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Cartões de Crédito
              </h2>
              {cardsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : cards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum cartão cadastrado ainda.{" "}
                  <button className="underline" onClick={() => navigate("/cartoes")}>
                    Cadastrar um cartão
                  </button>
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cards.map((card: { id: number; name: string; brand: string; color: string }) => (
                    <button
                      key={card.id}
                      onClick={() => navigate(`/cartoes/${card.id}/importar`)}
                      className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: card.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{card.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{card.brand}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </details>
      </div>
    </div>
  );
}

function QueueCard({
  item,
  cards,
  accounts,
  onChooseEntity,
  onReview,
  onRemove,
}: {
  item: QueuedFile;
  cards: Array<{ id: number; name: string; brand: string }>;
  accounts: Array<{ id: number; name: string; bank: string }>;
  onChooseEntity: (choice: EntityChoice) => void;
  onReview: () => void;
  onRemove: () => void;
}) {
  if (item.status === "processing") {
    return (
      <Card className="p-4 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.fileName}</p>
          <p className="text-xs text-muted-foreground">Lendo o arquivo e identificando o cartão/conta...</p>
        </div>
      </Card>
    );
  }

  if (item.status === "error") {
    return (
      <Card className="p-4 flex items-center gap-3 border-red-200 bg-red-50">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{item.fileName}</p>
          <p className="text-xs text-red-700">{item.error}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </Card>
    );
  }

  const result = item.result!;
  const { isCard, creditos, parcelas, vista, receitas, despesas, porRegra, total } = summarize(result);
  const detected = result.detectedEntity;
  const mismatch = result.totalMismatch;
  // "high" confidence (últimos 4 dígitos ou número de conta bateram exato)
  // segue direto. Qualquer outra coisa — sem detecção, ou um palpite "low"
  // (só um cartão dessa bandeira, por exemplo) — para e pede confirmação,
  // como você pediu.
  const needsConfirmation = !detected || detected.confidence === "low";

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {isCard ? "Fatura de cartão de crédito" : "Extrato de conta bancária"}
            {result.document.issuerBank ? ` · ${result.document.issuerBank}` : ""}
            {result.document.cardProductName ? ` · ${result.document.cardProductName}` : ""}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {detected && !needsConfirmation ? (
        <div className="flex items-center gap-2 text-sm bg-purple-50 text-purple-800 px-3 py-2 rounded-lg">
          <Sparkles className="h-4 w-4 flex-shrink-0" />
          <span>
            Detectei: <strong>{detected.label}</strong>
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-sm bg-amber-50 text-amber-800 px-3 py-2 rounded-lg">
          <FileQuestion className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p>
              {detected
                ? <>Acho que é <strong>{detected.label}</strong>, mas não tenho certeza — confirme ou troque:</>
                : "Não consegui identificar sozinho qual cartão/conta é esse arquivo. Escolha abaixo:"}
            </p>
            <Select
              value={item.manualChoice ? `${item.manualChoice.entityType}:${item.manualChoice.entityId}` : undefined}
              onValueChange={(v) => {
                const [entityType, id] = v.split(":");
                onChooseEntity({ entityType: entityType as "creditCard" | "bankAccount", entityId: parseInt(id, 10) });
              }}
            >
              <SelectTrigger className="bg-white w-full sm:w-72">
                <SelectValue placeholder="Selecione o cartão ou a conta" />
              </SelectTrigger>
              <SelectContent>
                {cards.map((c) => (
                  <SelectItem key={`creditCard:${c.id}`} value={`creditCard:${c.id}`}>
                    💳 {c.name} ({c.brand})
                  </SelectItem>
                ))}
                {accounts.map((a) => (
                  <SelectItem key={`bankAccount:${a.id}`} value={`bankAccount:${a.id}`}>
                    🏦 {a.name} ({a.bank})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {mismatch && (
        <div className="flex items-start gap-2 text-sm bg-red-50 text-red-800 px-3 py-2 rounded-lg border border-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {isCard
                ? <>A soma das transações (R$ {mismatch.extracted.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) não bate com o total impresso na fatura (R$ {mismatch.printed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).</>
                : <>A variação de saldo das transações (R$ {mismatch.extracted.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) não bate com a diferença entre saldo inicial e final do extrato (R$ {mismatch.printed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).</>}
            </p>
            <p className="text-xs mt-1">
              {isCard
                ? "A IA pode ter incluído alguma transação a mais ou a menos (ex: parcelas de faturas futuras)."
                : "A IA pode ter errado o sinal de alguma transação (entrada/saída) ou pulado uma linha."}{" "}
              Confira com atenção na tela de revisão antes de importar.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {isCard ? (
          <>
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">{vista} à vista</span>
            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{parcelas} parcelada(s)</span>
            {creditos > 0 && (
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">{creditos} crédito(s)/estorno(s)</span>
            )}
          </>
        ) : (
          <>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">{receitas} receita(s)</span>
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">{despesas} despesa(s)</span>
          </>
        )}
        {porRegra > 0 && (
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{porRegra} pela(s) sua(s) regra(s)</span>
        )}
        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{total} no total</span>
      </div>

      <Button onClick={onReview} disabled={needsConfirmation && !item.manualChoice} className="w-full">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Revisar e importar
      </Button>
    </Card>
  );
}
