"use client";

import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, ArrowLeft, Plus, Trash2, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import * as pdfjs from "pdfjs-dist";
import {
  parseFileWithBankDetection,
  getBankInfo,
  detectBank,
  type BankType,
  parseItauXLS,
} from "@/lib/bankDetection";
import { TransactionCategorizer, type TransactionWithCategory } from "@/components/TransactionCategorizer";
import { DescriptionBatchEditor } from "@/components/DescriptionBatchEditor";
import { DueDateConfirmDialog } from "@/components/DueDateConfirmDialog";

type ImportType = "creditCard" | "bankAccount";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  isDuplicate?: boolean;
  categoryId?: number;
  isInstallment?: boolean; // parcela de mês anterior
}

// ─────────────────────────────────────────────────────────────────────────────
// Extrai ano e mês de referência da fatura pelo nome do arquivo
// Ex: "fatura-20260506master.csv" → { year: 2026, month: 4 } (mês anterior ao vencimento)
// Ex: "fatura-20260101visa.csv"   → { year: 2025, month: 12 }
// ─────────────────────────────────────────────────────────────────────────────
function extrairMesFatura(fileName: string): { year: number; month: number } | null {
  // Tenta pegar YYYYMMDD do nome do arquivo
  const match = fileName.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1]);
  const month = parseInt(match[2]); // mês de vencimento
  // Mês de referência = mês anterior ao vencimento
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

// Decide se uma transação é parcela de mês anterior
// Regra: data da transação está 2+ meses antes do mês de referência da fatura
function isParcelaAnterior(
  txDate: string,
  faturaRef: { year: number; month: number }
): boolean {
  const d = new Date(txDate + "T12:00:00");
  const txYear = d.getFullYear();
  const txMonth = d.getMonth() + 1;
  // Diferença em meses
  const diffMeses = (faturaRef.year - txYear) * 12 + (faturaRef.month - txMonth);
  // Se a transação foi há 2+ meses antes do mês da fatura, é parcela antiga
  return diffMeses >= 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilitário: extrai o sufixo de parcelamento "XX/YY" do final da descrição
// Ex: "SAMSUNG NO ITAU   02/21" → { base: "SAMSUNG NO ITAU", parcela: "02/21" }
// ─────────────────────────────────────────────────────────────────────────────
function extrairParcelamento(desc: string): { base: string; parcela: string | null } {
  // Padrão: 2 dígitos / 2 dígitos no final (com possíveis espaços antes)
  const match = desc.trim().match(/^(.*?)\s+(\d{2}\/\d{2})\s*$/);
  if (match) {
    return { base: match[1].trim(), parcela: match[2] };
  }
  return { base: desc.trim(), parcela: null };
}

// Descrições que indicam que a linha NÃO é uma transação real de compra
const SKIP_DESCRIPTIONS = [
  "pagamento efetuado",
  "pagamento recebido",
  "estorno",
  "iof compra internaciona",  // IOF é cobrado separado — manter se quiser, mas geralmente ruído
];

function deveIgnorarLinha(desc: string, valor: number): boolean {
  const descLower = desc.toLowerCase().trim();
  // Pagamentos e estornos (valores negativos ou descrições específicas)
  if (SKIP_DESCRIPTIONS.some(s => descLower.includes(s))) return true;
  // Valores negativos são estornos/créditos — não importar como despesa
  if (valor < 0) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser para CSV de fatura Itaú (formato: data,lançamento,valor)
// ─────────────────────────────────────────────────────────────────────────────
function parseCSVFatura(csvText: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());

  // Detectar linha de cabeçalho
  let dataIdx = -1, descIdx = -1, valorIdx = -1;
  let startLine = 0;

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").trim().toLowerCase());
    const dI = cols.findIndex(c => c.includes("data") || c === "date");
    const descI = cols.findIndex(c => c.includes("lan") || c.includes("descr") || c.includes("hist"));
    const vI = cols.findIndex(c => c.includes("valor") || c === "value" || c === "amount");
    if (dI !== -1 && vI !== -1) {
      dataIdx = dI;
      descIdx = descI !== -1 ? descI : (dI === 0 ? 1 : 0);
      valorIdx = vI;
      startLine = i + 1;
      break;
    }
  }

  if (dataIdx === -1) return transactions;

  for (let i = startLine; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    // Parsear CSV respeitando aspas
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of raw) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());

    const dateRaw = cols[dataIdx]?.replace(/^"|"$/g, "").trim();
    const desc = cols[descIdx]?.replace(/^"|"$/g, "").trim();
    const amountRaw = cols[valorIdx]?.replace(/^"|"$/g, "").trim();

    if (!dateRaw || !desc || !amountRaw) continue;

    // Formatar data: aceita YYYY-MM-DD ou DD/MM/YYYY
    let formattedDate = "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      formattedDate = dateRaw;
    } else {
      const m = dateRaw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (m) {
        const year = m[3].length === 2 ? "20" + m[3] : m[3];
        formattedDate = `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      } else continue;
    }

    // Parsear valor (mantém sinal para filtrar negativos)
    let amount = amountRaw.replace(/[R$\s]/g, "");
    if (amount.includes(".") && amount.includes(",")) {
      amount = amount.replace(".", "").replace(",", ".");
    } else {
      amount = amount.replace(",", ".");
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed)) continue;

    // ── FIX 1: Filtrar pagamentos, estornos e valores negativos ──────────────
    if (deveIgnorarLinha(desc, parsed)) continue;

    transactions.push({
      id: Date.now().toString() + Math.random(),
      date: formattedDate,
      description: desc,
      amount: Math.abs(parsed).toFixed(2),
    });
  }

  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser para XLS do Bradesco
// ─────────────────────────────────────────────────────────────────────────────
function parseBradescoXLS(data: any[][]): Transaction[] {
  const transactions: Transaction[] = [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const rowStr = row.map(c => String(c ?? "").toLowerCase()).join(" ");
    if (rowStr.includes("data") && rowStr.includes("hist") && (rowStr.includes("créd") || rowStr.includes("déb") || rowStr.includes("cred") || rowStr.includes("deb"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return transactions;

  const header = data[headerIdx].map(c => String(c ?? "").toLowerCase());
  const dateCol   = header.findIndex(c => c.includes("data"));
  const descCol   = header.findIndex(c => c.includes("hist"));
  const creditCol = header.findIndex(c => c.includes("cred") || c.includes("créd"));
  const debitCol  = header.findIndex(c => c.includes("deb") || c.includes("déb"));

  if (dateCol === -1 || descCol === -1) return transactions;

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const dateRaw = String(row[dateCol] ?? "").trim();
    if (!dateRaw || !/\d/.test(dateRaw)) continue;

    const desc = String(row[descCol] ?? "").trim();
    if (!desc) continue;

    const descLower = desc.toLowerCase();
    if (
      descLower.includes("saldo") ||
      descLower.includes("total") ||
      descLower === "" ||
      descLower.includes("sac ") ||
      descLower.includes("alô brad") ||
      descLower.includes("ouvidoria")
    ) continue;

    let formattedDate = "";
    const m = dateRaw.match(/(\d{1,2})\/(\d{2,4})(?:\/(\d{2,4}))?/);
    if (m) {
      let day = m[1], month = m[2], year = m[3];
      if (!year) {
        year = new Date().getFullYear().toString();
      } else if (year.length === 2) {
        year = "20" + year;
      }
      if (month.length > 2) continue;
      formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    } else continue;

    const parseCell = (val: any): number => {
      if (val === null || val === undefined || val === "") return 0;
      if (typeof val === "number") return Math.abs(val);
      let s = String(val).replace(/[R$\s.]/g, "").replace(",", ".");
      return Math.abs(parseFloat(s) || 0);
    };

    const credit = creditCol !== -1 ? parseCell(row[creditCol]) : 0;
    const debit  = debitCol  !== -1 ? parseCell(row[debitCol])  : 0;
    const amount = credit > 0 ? credit : debit;

    if (!amount || amount === 0) continue;

    transactions.push({
      id: Date.now().toString() + Math.random(),
      date: formattedDate,
      description: desc,
      amount: amount.toFixed(2),
    });
  }

  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser genérico para XLSX
// ─────────────────────────────────────────────────────────────────────────────
function parseXLSXData(data: any[][]): Transaction[] {
  const transactions: Transaction[] = [];
  if (!data || data.length === 0) return transactions;

  const itauResult = parseItauXLS(data);
  if (itauResult.length > 0) return itauResult;

  const bradescoResult = parseBradescoXLS(data);
  if (bradescoResult.length > 0) return bradescoResult;

  let headerIndex = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const rowStr = row.map(c => String(c ?? "")).join(" ").toLowerCase();
    if (rowStr.includes("data") && (rowStr.includes("hist") || rowStr.includes("descr") || rowStr.includes("valor"))) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) return transactions;

  const headerRow = data[headerIndex].map(c => String(c ?? "").toLowerCase());
  let dateCol = -1, descCol = -1, amountCol = -1;
  for (let i = 0; i < headerRow.length; i++) {
    const cell = headerRow[i];
    if (cell.includes("data") || cell.includes("date")) dateCol = i;
    if (cell.includes("hist") || cell.includes("descr") || cell.includes("lanca")) descCol = i;
    if (cell.includes("valor") || cell.includes("r$") || cell.includes("amount")) amountCol = i;
  }

  for (let i = headerIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    const dateStr   = row[dateCol];
    const description = row[descCol];
    const amountStr = row[amountCol];
    if (!dateStr || !description || !amountStr) continue;

    const descLower = String(description).toLowerCase();
    if (descLower.includes("total") || descLower.includes("saldo") || descLower.includes("limite")) continue;

    const dateMatch = String(dateStr).match(/(\d{1,2})\/(\d{1,2})/);
    if (!dateMatch) continue;
    const [, day, month] = dateMatch;
    const year = new Date().getFullYear();
    const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    let amount = String(amountStr).trim().replace(/[R$]/g, "").trim();
    if (amount.includes(".") && amount.includes(",")) {
      amount = amount.replace(".", "").replace(",", ".");
    } else {
      amount = amount.replace(",", ".");
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed)) continue;

    transactions.push({
      id: Date.now().toString() + Math.random(),
      date: formattedDate,
      description: String(description).trim(),
      amount: Math.abs(parsed).toFixed(2),
    });
  }

  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2: Verificação de duplicatas que respeita parcelamentos
// Parcelas com sufixo XX/YY diferente NUNCA são duplicatas entre si
// ─────────────────────────────────────────────────────────────────────────────
function isDuplicateTransaction(
  tx: { date: string; description: string; amount: string },
  existingDups: Array<{ date: string; description: string; amount: string }>
): boolean {
  const { base: txBase, parcela: txParcela } = extrairParcelamento(tx.description);

  return existingDups.some(dup => {
    const { base: dupBase, parcela: dupParcela } = extrairParcelamento(dup.description);

    // Se ambas têm parcela e são diferentes → NÃO é duplicata
    if (txParcela !== null && dupParcela !== null && txParcela !== dupParcela) {
      return false;
    }

    const sameDate = new Date(dup.date).toISOString().split("T")[0] === tx.date;
    const sameAmount = dup.amount === tx.amount;
    // Compara a base da descrição (sem sufixo de parcela)
    const sameDesc = dupBase.toLowerCase() === txBase.toLowerCase();

    return sameDate && sameAmount && sameDesc;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function ImportFile() {
  const { cardId, accountId } = useParams();
  const [location, navigate] = useLocation();
  const importType: ImportType = location.startsWith("/cartoes/") ? "creditCard" : "bankAccount";
  const entityId = importType === "creditCard"
    ? parseInt(cardId || accountId || "0")
    : parseInt(accountId || cardId || "0");

  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedBank, setDetectedBank] = useState<BankType | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showCategorizer, setShowCategorizer] = useState(false);
  const [showDescriptionEditor, setShowDescriptionEditor] = useState(false);
  const [extractedDueDate, setExtractedDueDate] = useState<Date | null>(null);
  const [confirmedDueDate, setConfirmedDueDate] = useState<Date | null>(null);
  const [showDueDateConfirm, setShowDueDateConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardQuery = trpc.creditCards.get.useQuery(
    { id: entityId },
    { enabled: importType === "creditCard" }
  );
  const accountQuery = trpc.bankAccounts.get.useQuery(
    { id: entityId },
    { enabled: importType === "bankAccount" }
  );

  const importMutation = trpc.files.import.useMutation();
  const categoriesQuery = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();

  const entity = importType === "creditCard" ? cardQuery.data : accountQuery.data;
  const isLoadingEntity = importType === "creditCard" ? cardQuery.isLoading : accountQuery.isLoading;

  const ACCEPTED_EXTENSIONS = [".pdf", ".ofx", ".txt", ".xlsx", ".xls", ".csv"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = "." + selectedFile.name.split(".").pop()?.toLowerCase();

      if (!ACCEPTED_EXTENSIONS.includes(fileExtension)) {
        toast.error("Por favor, selecione um arquivo PDF, OFX, TXT, XLSX, XLS ou CSV");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("O arquivo não pode ser maior que 10MB");
        return;
      }

      setFile(selectedFile);
      setDetectedBank(null);
      setTransactions([]);
      setDuplicates([]);
      setShowDuplicateWarning(false);
      toast.success("Arquivo selecionado com sucesso!");
    }
  };

  const addTransaction = () => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
    };
    setTransactions([...transactions, newTransaction]);
  };

  const updateTransaction = (id: string, field: keyof Transaction, value: string) => {
    setTransactions(transactions.map(tx =>
      tx.id === id ? { ...tx, [field]: value } : tx
    ));
  };

  const removeTransaction = (id: string) => {
    setTransactions(transactions.filter(tx => tx.id !== id));
  };

  const handleProcessFile = async () => {
    if (!file) {
      toast.error("Por favor, selecione um arquivo primeiro");
      return;
    }

    setIsLoading(true);
    try {
      let extractedTransactions: Transaction[] = [];
      let bank: BankType | null = null;
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (fileExtension === "csv") {
        const text = await file.text();
        bank = detectBank(text);
        extractedTransactions = parseCSVFatura(text);

      } else if (fileExtension === "pdf") {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        let fullText = "";
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const text = textContent.items.map((item: any) => item.str).join(" ");
          fullText += text + "\n";
        }
        const result = await parseFileWithBankDetection(fullText, "pdf");
        extractedTransactions = result.transactions;
        bank = result.bank;
        setExtractedDueDate(result.dueDate || null);

      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

        // Priorizar aba "Lançamentos" (Itaú) se existir
        let rawData: any[][] = [];
        const lancamentosSheet = workbook.SheetNames.find(n =>
          n.toLowerCase().includes("lançamentos") || n.toLowerCase().includes("lancamentos")
        );
        if (lancamentosSheet) {
          rawData = XLSX.utils.sheet_to_json(workbook.Sheets[lancamentosSheet], { header: 1 }) as any[][];
        } else {
          for (const sheetName of workbook.SheetNames) {
            const candidate = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as any[][];
            const csvCheck = candidate.slice(0, 15).map(r => r.join(" ").toLowerCase()).join(" ");
            if (csvCheck.includes("data") && (csvCheck.includes("lan") || csvCheck.includes("valor") || csvCheck.includes("créd"))) {
              rawData = candidate;
              break;
            }
          }
        }
        if (rawData.length === 0) {
          rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[][];
        }

        const csvText = rawData.map(r => r.join(",")).join("\n");
        // Para XLS do Itaú com aba Lançamentos, forçar banco como itau
        bank = lancamentosSheet ? "itau" : detectBank(csvText);

        if (bank === "itau") {
          extractedTransactions = parseItauXLS(rawData);
        } else if (bank === "bradesco") {
          extractedTransactions = parseBradescoXLS(rawData);
        } else {
          extractedTransactions = parseXLSXData(rawData);
        }

        if (importType === "creditCard") {
          const result = await parseFileWithBankDetection(csvText, "xlsx");
          setExtractedDueDate(result.dueDate || null);
        }

      } else {
        toast.error("Formato de arquivo não suportado para processamento automático");
        return;
      }

      if (extractedTransactions.length === 0) {
        toast.warning("Nenhuma transação encontrada no arquivo. Tente adicionar manualmente.");
        return;
      }

      // Marcar parcelas de meses anteriores pelo nome do arquivo
      const faturaRef = extrairMesFatura(file.name);
      const markedTransactions = extractedTransactions.map(tx => ({
        ...tx,
        isInstallment: faturaRef ? isParcelaAnterior(tx.date, faturaRef) : false,
      }));

      setTransactions(markedTransactions);
      setPendingTransactions(markedTransactions);
      setDetectedBank(bank);

      const comprasMes = markedTransactions.filter(t => !t.isInstallment).length;
      const parcelas = markedTransactions.filter(t => t.isInstallment).length;
      const bankInfo = bank ? getBankInfo(bank) : null;
      const bankName = bankInfo?.name || "Banco desconhecido";
      toast.success(
        `${markedTransactions.length} transação(ões) de ${bankName}: ${comprasMes} do mês${parcelas > 0 ? `, ${parcelas} parcela(s)` : ""}`
      );

      if (importType === "creditCard") {
        setShowDueDateConfirm(true);
      } else {
        await checkForDuplicates(extractedTransactions);
      }

    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setIsLoading(false);
    }
  };

  const checkForDuplicates = async (txs: Transaction[]) => {
    try {
      const result = await utils.files.checkDuplicates.fetch({
        entityType: importType,
        entityId,
        transactions: txs.map((tx) => ({
          date: new Date(tx.date),
          description: tx.description,
          amount: tx.amount,
        })),
      });

      let updatedTxs = txs;

      if (result && result.duplicates && result.duplicates.length > 0) {
        // ── FIX 2: Aplicar lógica de parcelamento na marcação de duplicatas ────
        updatedTxs = txs.map((tx) => ({
          ...tx,
          isDuplicate: isDuplicateTransaction(tx, result.duplicates),
        }));

        const realDuplicates = updatedTxs.filter(tx => tx.isDuplicate);
        setTransactions(updatedTxs);
        setDuplicates(result.duplicates);

        if (realDuplicates.length > 0) {
          setShowDuplicateWarning(true);
          toast.warning(
            `${realDuplicates.length} transação(ões) pode(m) ser duplicada(s). Revise antes de importar.`
          );
        } else {
          setShowDuplicateWarning(false);
        }
      } else {
        setDuplicates([]);
        setShowDuplicateWarning(false);
      }

      // ── FIX 3: Abrir categorizer automaticamente após checar duplicatas ─────
      setShowCategorizer(true);

    } catch (error) {
      console.error("Erro ao verificar duplicatas:", error);
      // Mesmo com erro, abre o categorizer
      setShowCategorizer(true);
    }
  };

  const handleCategoriesApplied = async (categorizedTransactions: TransactionWithCategory[]) => {
    setTransactions(categorizedTransactions);
    setShowCategorizer(false);
    // Importar direto com as transações categorizadas (não depende do estado assíncrono)
    await handleImportWithTransactions(categorizedTransactions);
  };

  const handleDescriptionsNormalized = (normalizedTransactions: Transaction[]) => {
    setTransactions(normalizedTransactions);
    setShowDescriptionEditor(false);
    toast.success("Descrições normalizadas com sucesso!");
  };

  const handleImportWithTransactions = async (txs: TransactionWithCategory[]) => {
    if (txs.length === 0) {
      toast.error("Nenhuma transação para importar");
      return;
    }

    for (const tx of txs) {
      if (!tx.date || !tx.description || !tx.amount) {
        toast.error("Por favor, preencha todos os campos de cada transação");
        return;
      }
      if (isNaN(parseFloat(tx.amount))) {
        toast.error("O valor deve ser um número válido");
        return;
      }
    }

    setIsLoading(true);
    try {
      const formattedTransactions = txs.map(tx => {
        const raw = parseFloat(tx.amount);
        // Cartão: positivo = compra (expense), negativo = estorno/devolução (income)
        // Conta: positivo = entrada (income), negativo = saída (expense)
        const type: "income" | "expense" = importType === "creditCard"
          ? (raw >= 0 ? "expense" : "income")
          : (raw >= 0 ? "income" : "expense");
        const base = {
          date: new Date(tx.date),
          description: tx.description,
          amount: Math.abs(raw).toFixed(2),
          type,
        };
        if (tx.categoryId) {
          return { ...base, categoryId: tx.categoryId };
        }
        return base;
      });

      console.log("[Import] Enviando", formattedTransactions.length, "transações");
      console.log("[Import] Exemplo:", formattedTransactions[0]);

      // Arquivo XLS/binário não pode ser lido como texto — manda vazio
      const isBinary = file?.name.match(/\.(xls|xlsx)$/i);
      const fileContent = isBinary ? "" : (file ? await file.text() : "");

      const result = await importMutation.mutateAsync({
        entityType: importType,
        entityId,
        fileContent,
        fileName: file?.name || "manual-import",
        fileType: file?.type || "text/plain",
        transactions: formattedTransactions,
        dueDate: confirmedDueDate || undefined,
      });

      console.log("[Import] Resultado:", result);

      if (result.success) {
        toast.success(`${result.transactionsImported} transações importadas com sucesso!`);
        setTimeout(() => {
          navigate(importType === "creditCard" ? `/cartoes/${entityId}` : `/contas/${entityId}`);
        }, 1000);
      }
    } catch (error) {
      console.error("[Import] Erro:", error);
      toast.error("Erro ao importar transações: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    await handleImportWithTransactions(transactions);
  };

  if (isLoadingEntity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <p className="text-red-600 mb-4">Entidade não encontrada</p>
          <Button onClick={() => navigate("/")} variant="outline">Voltar</Button>
        </Card>
      </div>
    );
  }

  if (showDescriptionEditor && transactions.length > 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setShowDescriptionEditor(false)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Normalizar Descrições</h1>
          </div>
          <DescriptionBatchEditor
            transactions={transactions}
            onApplyTransformations={handleDescriptionsNormalized}
            onCancel={() => setShowDescriptionEditor(false)}
          />
        </div>
      </div>
    );
  }

  // Tela de categorização — import dispara automaticamente ao clicar "Salvar Categorias"
  if (showCategorizer && transactions.length > 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setShowCategorizer(false)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Categorizar Transações</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {transactions.length} transação(ões) • {transactions.filter(t => t.isDuplicate).length > 0
                  ? `${transactions.filter(t => t.isDuplicate).length} possível(is) duplicata(s) marcada(s)`
                  : "Nenhuma duplicata detectada"}
              </p>
            </div>
          </div>
          <TransactionCategorizer
            transactions={transactions}
            onCategoriesApplied={handleCategoriesApplied}
            onCancel={() => setShowCategorizer(false)}
          />
        </div>
      </div>
    );
  }

  const fileExtension = file?.name.split(".").pop()?.toLowerCase() ?? "";
  const canProcess = ["xlsx", "xls", "pdf", "csv"].includes(fileExtension);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(importType === "creditCard" ? `/cartoes/${entityId}` : `/contas/${entityId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Importar Transações</h1>
            <p className="text-muted-foreground">
              {importType === "creditCard" ? `Cartão: ${entity.name}` : `Conta: ${entity.name}`}
            </p>
          </div>
        </div>

        {/* File Upload Section */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload de Arquivo (Opcional)
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.ofx,.txt,.xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {file ? file.name : "Selecionar arquivo"}
                  </Button>
                </div>
                {file && (
                  <div className="text-sm text-green-600 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Selecionado
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: PDF, XLSX, XLS, CSV, OFX, TXT
              </p>
            </div>

            {file && canProcess && (
              <div className="space-y-2">
                <Button
                  onClick={handleProcessFile}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>Carregar Transações do Arquivo</>
                  )}
                </Button>
                {detectedBank && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                    <CheckCircle className="h-4 w-4" />
                    <span>Banco detectado: <strong>{getBankInfo(detectedBank).name}</strong></span>
                  </div>
                )}
                {showDuplicateWarning && duplicates.length > 0 && (
                  <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{duplicates.length} transação(ões) pode(m) ser duplicada(s)</p>
                      <p className="text-xs mt-1">Verifique as transações marcadas antes de importar</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Transactions Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Transações</h2>
            <div className="flex gap-2">
              {transactions.length > 0 && (
                <>
                  <Button
                    onClick={() => setShowDescriptionEditor(true)}
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    Normalizar Descrições
                  </Button>
                  <Button
                    onClick={() => setShowCategorizer(true)}
                    size="sm"
                    variant="outline"
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    Categorizar
                  </Button>
                </>
              )}
              <Button onClick={addTransaction} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Transação
              </Button>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma transação adicionada ainda.</p>
              <p className="text-sm">Clique em "Adicionar Transação" para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Data</th>
                    <th className="text-left py-2 px-2">Descrição</th>
                    <th className="text-right py-2 px-2">Valor</th>
                    <th className="text-center py-2 px-2">Status</th>
                    <th className="text-center py-2 px-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`border-b hover:bg-muted/50 ${tx.isDuplicate ? "bg-amber-50" : ""}`}
                    >
                      <td className="py-2 px-2">
                        <Input
                          type="date"
                          value={tx.date}
                          onChange={(e) => updateTransaction(tx.id, "date", e.target.value)}
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="text"
                          placeholder="Descrição"
                          value={tx.description}
                          onChange={(e) => updateTransaction(tx.id, "description", e.target.value)}
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={tx.amount}
                          onChange={(e) => updateTransaction(tx.id, "amount", e.target.value)}
                          className="h-8 text-right"
                          step="0.01"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        {tx.isDuplicate ? (
                          <div className="flex items-center justify-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                            <AlertCircle className="h-3 w-3" />
                            Duplicada
                          </div>
                        ) : tx.categoryId ? (
                          <div className="flex items-center justify-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            <CheckCircle className="h-3 w-3" />
                            Categorizada
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTransaction(tx.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => navigate(importType === "creditCard" ? `/cartoes/${entityId}` : `/contas/${entityId}`)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={isLoading || transactions.length === 0}
              className="flex-1"
            >
              {isLoading
                ? "Importando..."
                : `Importar ${transactions.length} Transação${transactions.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </Card>
      </div>

      {/* DueDate Confirmation Dialog */}
      {showDueDateConfirm && importType === "creditCard" && (
        <DueDateConfirmDialog
          extractedDate={extractedDueDate}
          bankName={detectedBank ? getBankInfo(detectedBank).name : "Banco"}
          onConfirm={(date) => {
            setConfirmedDueDate(date);
            setShowDueDateConfirm(false);
            checkForDuplicates(pendingTransactions);
          }}
          onCancel={() => {
            setShowDueDateConfirm(false);
            setConfirmedDueDate(null);
            checkForDuplicates(pendingTransactions);
          }}
        />
      )}
    </div>
  );
}
