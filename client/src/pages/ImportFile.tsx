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
  type BankType,
} from "@/lib/bankDetection";

type ImportType = "creditCard" | "bankAccount";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  isDuplicate?: boolean;
}

export default function ImportFile() {
  const { cardId, accountId } = useParams();
  const [, navigate] = useLocation();
  
  const importType: ImportType = cardId ? "creditCard" : "bankAccount";
  const entityId = cardId ? parseInt(cardId || "0") : parseInt(accountId || "0");
  
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedBank, setDetectedBank] = useState<BankType | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
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

  const entity = importType === "creditCard" ? cardQuery.data : accountQuery.data;
  const isLoadingEntity = importType === "creditCard" ? cardQuery.isLoading : accountQuery.isLoading;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validExtensions = [".pdf", ".ofx", ".txt", ".xlsx", ".xls"];
      const fileExtension = "." + selectedFile.name.split(".").pop()?.toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        toast.error("Por favor, selecione um arquivo PDF, OFX, TXT, XLSX ou XLS");
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
      date: new Date().toISOString().split('T')[0],
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
      
      if (fileExtension === "pdf") {
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
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        
        const result = await parseFileWithBankDetection(csvText, "xlsx");
        extractedTransactions = result.transactions;
        bank = result.bank;
      } else {
        toast.error("Formato de arquivo não suportado para processamento automático");
        return;
      }
      
      if (extractedTransactions.length === 0) {
        toast.warning("Nenhuma transação encontrada no arquivo. Tente adicionar manualmente.");
        return;
      }
      
      setTransactions(extractedTransactions);
      setDetectedBank(bank);
      
      const bankInfo = bank ? getBankInfo(bank) : null;
      const bankName = bankInfo?.name || "Banco desconhecido";
      toast.success(
        `${extractedTransactions.length} transação(ões) extraída(s) de ${bankName}!`
      );
      
      // Check for duplicates
      await checkForDuplicates(extractedTransactions);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setIsLoading(false);
    }
  };

  const checkForDuplicates = async (txs: Transaction[]) => {
    try {
      // Call checkDuplicates query using the client
      const utils = trpc.useUtils();
      const result = await utils.files.checkDuplicates.fetch({
        entityType: importType,
        entityId,
        transactions: txs.map((tx) => ({
          date: new Date(tx.date),
          description: tx.description,
          amount: tx.amount,
        })),
      });

      if (result && result.duplicates && result.duplicates.length > 0) {
        // Mark duplicates in transaction list
        const updatedTxs = txs.map((tx) => ({
          ...tx,
          isDuplicate: result.duplicates.some(
            (dup: any) =>
              new Date(dup.date).toISOString().split('T')[0] === tx.date &&
              dup.description === tx.description &&
              dup.amount === tx.amount
          ),
        }));
        setTransactions(updatedTxs);
        setDuplicates(result.duplicates);
        setShowDuplicateWarning(true);
        toast.warning(
          `${result.duplicates.length} transação(ões) pode(m) ser duplicada(s). Revise antes de importar.`
        );
      } else {
        setDuplicates([]);
        setShowDuplicateWarning(false);
      }
    } catch (error) {
      console.error("Erro ao verificar duplicatas:", error);
      // Continue anyway if duplicate check fails
    }
  };

  const handleImport = async () => {
    if (transactions.length === 0) {
      toast.error("Por favor, adicione pelo menos uma transação");
      return;
    }

    // Validate transactions
    for (const tx of transactions) {
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
      const formattedTransactions = transactions.map(tx => ({
        date: new Date(tx.date),
        description: tx.description,
        amount: tx.amount,
        type: "expense" as const,
      }));

      const result = await importMutation.mutateAsync({
        entityType: importType,
        entityId,
        fileContent: file ? await file.text() : "",
        fileName: file?.name || "manual-import",
        fileType: file?.type || "text/plain",
        transactions: formattedTransactions,
      });

      if (result.success) {
        toast.success(`${result.transactionsImported} transações importadas com sucesso!`);
        setTimeout(() => {
          navigate(importType === "creditCard" ? `/cartoes/${entityId}` : `/contas/${entityId}`);
        }, 1000);
      }
    } catch (error) {
      toast.error("Erro ao importar transações: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setIsLoading(false);
    }
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
          <Button onClick={() => navigate("/")} variant="outline">
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

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
                    accept=".pdf,.ofx,.txt,.xlsx,.xls"
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
            </div>
            
            {file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.pdf')) && (
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
                      <p className="text-xs mt-1">Verifique as transações marcadas abaixo antes de importar</p>
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
            <Button onClick={addTransaction} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Transação
            </Button>
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
                      className={`border-b hover:bg-muted/50 ${
                        tx.isDuplicate ? "bg-amber-50" : ""
                      }`}
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
                        {tx.isDuplicate && (
                          <div className="flex items-center justify-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                            <AlertCircle className="h-3 w-3" />
                            Duplicada
                          </div>
                        )}
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
              {isLoading ? "Importando..." : `Importar ${transactions.length} Transação${transactions.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
