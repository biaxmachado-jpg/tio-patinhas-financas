"use client";

import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, ArrowLeft, Plus, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import * as pdfjs from "pdfjs-dist";

type ImportType = "creditCard" | "bankAccount";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
}

export default function ImportFile() {
  const { cardId, accountId } = useParams();
  const [, navigate] = useLocation();
  
  const importType: ImportType = cardId ? "creditCard" : "bankAccount";
  const entityId = cardId ? parseInt(cardId || "0") : parseInt(accountId || "0");
  
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  const parseXLSXFile = async (file: File): Promise<Transaction[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      const extractedTransactions: Transaction[] = [];
      
      // Skip header row if present
      const startRow = data[0]?.some((cell: any) => 
        typeof cell === 'string' && (cell.toLowerCase().includes('data') || cell.toLowerCase().includes('date'))
      ) ? 1 : 0;
      
      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3) continue;
        
        // Try to extract date, description, and amount
        const dateStr = row[0]?.toString().trim();
        const description = row[1]?.toString().trim();
        const amountStr = row[2]?.toString().trim();
        
        if (!dateStr || !description || !amountStr) continue;
        
        // Parse date
        let date = dateStr;
        try {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            date = parsed.toISOString().split('T')[0];
          }
        } catch (e) {
          // Keep original format
        }
        
        // Parse amount
        const cleanAmount = amountStr.replace(/[^0-9.,]/g, '').replace(',', '.');
        if (isNaN(parseFloat(cleanAmount))) continue;
        
        extractedTransactions.push({
          id: Date.now().toString() + Math.random(),
          date,
          description,
          amount: cleanAmount,
        });
      }
      
      return extractedTransactions;
    } catch (error) {
      console.error('Erro ao parsear XLSX:', error);
      throw new Error('Erro ao ler arquivo XLSX');
    }
  };

  const parsePDFFile = async (file: File): Promise<Transaction[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const extractedTransactions: Transaction[] = [];
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(' ');
        
        // Simple regex to find patterns like "DD/MM/YYYY description value"
        const dateRegex = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g;
        const lines = text.split('\n');
        
        for (const line of lines) {
          const dateMatch = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
          if (!dateMatch) continue;
          
          // Extract amount (look for numbers with optional decimals)
          const amountMatch = line.match(/\d+[.,]\d{2}/);
          if (!amountMatch) continue;
          
          // Extract description (text between date and amount)
          const description = line.substring(dateMatch.index! + dateMatch[0].length, amountMatch.index).trim();
          if (!description) continue;
          
          // Format date
          const dateParts = dateMatch[0].split(/[\/\-]/);
          let date = dateMatch[0];
          if (dateParts.length === 3) {
            const [day, month, year] = dateParts;
            const fullYear = year.length === 2 ? '20' + year : year;
            date = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          
          const amount = amountMatch[0].replace(',', '.');
          
          extractedTransactions.push({
            id: Date.now().toString() + Math.random(),
            date,
            description,
            amount,
          });
        }
      }
      
      return extractedTransactions;
    } catch (error) {
      console.error('Erro ao parsear PDF:', error);
      throw new Error('Erro ao ler arquivo PDF');
    }
  };

  const handleProcessFile = async () => {
    if (!file) {
      toast.error("Por favor, selecione um arquivo primeiro");
      return;
    }

    setIsLoading(true);
    try {
      let extractedTransactions: Transaction[] = [];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      
      if (fileExtension === "xlsx" || fileExtension === "xls") {
        extractedTransactions = await parseXLSXFile(file);
      } else if (fileExtension === "pdf") {
        extractedTransactions = await parsePDFFile(file);
      } else {
        toast.error("Formato de arquivo não suportado para processamento automático");
        return;
      }
      
      if (extractedTransactions.length === 0) {
        toast.warning("Nenhuma transação encontrada no arquivo. Tente adicionar manualmente.");
        return;
      }
      
      setTransactions(extractedTransactions);
      toast.success(`${extractedTransactions.length} transação(ões) extraída(s) do arquivo!`);
    } catch (error) {
      toast.error("Erro ao processar arquivo: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setIsLoading(false);
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
      // Convert transactions to the format expected by the API
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
                    <th className="text-center py-2 px-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-muted/50">
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
