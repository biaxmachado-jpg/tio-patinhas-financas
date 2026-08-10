"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown, Save, X, AlertCircle, CreditCard, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

export interface TransactionWithCategory {
  id: string;
  date: string;
  description: string;
  amount: string;
  categoryId?: number;
  isDuplicate?: boolean;
  isInstallment?: boolean;
  aiType?: "income" | "expense"; // tipo já classificado pela IA no momento da importação
  installments?: number; // total de parcelas, extraído da fatura pela IA (1 = não parcelado)
  currentInstallment?: number; // parcela atual cobrada nesta fatura
}

interface TransactionCategorizerProps {
  transactions: TransactionWithCategory[];
  onCategoriesApplied: (categorizedTransactions: TransactionWithCategory[]) => void;
  onCancel: () => void;
  // Faturas de cartão têm uma terceira seção (Créditos/Estornos) que
  // extratos bancários não têm — sem isso a tela não sabe separar.
  entityType?: "creditCard" | "bankAccount";
}

// Parsear keywords de qualquer formato que o banco retorne
function parseKeywords(raw: any): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try { return JSON.parse(trimmed).filter(Boolean); } catch {}
  }
  return trimmed.split(",").map((k: string) => k.trim()).filter(Boolean);
}

// Normalizar string: minúsculo + remove acentos
function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Aplica regras de categorização a uma descrição
function applyRules(description: string, rules: any[]): number | null {
  const sorted = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  for (const rule of sorted) {
    if (!rule.enabled) continue;
    const keywords = parseKeywords(rule.keywords);
    if (keywords.length === 0) continue;

    // Sempre normaliza (remove acentos + lowercase), a menos que caseSensitive
    const testStr = rule.caseSensitive ? description : normalizeStr(description);

    for (const kw of keywords) {
      if (!kw) continue;
      const testKw = rule.caseSensitive ? kw : normalizeStr(kw);
      switch (rule.matchType) {
        case "contains":   if (testStr.includes(testKw)) return rule.categoryId; break;
        case "exact":      if (testStr === testKw) return rule.categoryId; break;
        case "startsWith": if (testStr.startsWith(testKw)) return rule.categoryId; break;
        case "endsWith":   if (testStr.endsWith(testKw)) return rule.categoryId; break;
        default:           if (testStr.includes(testKw)) return rule.categoryId; break;
      }
    }
  }
  return null;
}

export function TransactionCategorizer({
  transactions,
  onCategoriesApplied,
  onCancel,
  entityType,
}: TransactionCategorizerProps) {
  const categoriesQuery = trpc.categories.list.useQuery();
  const rulesQuery = trpc.categorizationRules.list.useQuery();

  const [categorizedTransactions, setCategorizedTransactions] = useState<TransactionWithCategory[]>(transactions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const categories = categoriesQuery.data || [];
  const rules = rulesQuery.data || [];

  // Inicializar com as transactions recebidas
  useEffect(() => {
    setCategorizedTransactions(transactions);
  }, [transactions]);

  // Função de aplicar regras — pode ser chamada manualmente ou automático
  const aplicarRegras = useCallback((txs: TransactionWithCategory[], sobreescrever = false) => {
    if (rules.length === 0) {
      toast.error("Nenhuma regra de categorização encontrada");
      return txs;
    }
    let count = 0;
    const resultado = txs.map(tx => {
      if (!sobreescrever && tx.categoryId) return tx; // não sobrescreve se já tem
      const matched = applyRules(tx.description, rules);
      if (matched) { count++; return { ...tx, categoryId: matched }; }
      return tx;
    });
    toast.success(`${count} transação(ões) categorizada(s) automaticamente`);
    return resultado;
  }, [rules]);

  // Aplicar regras automaticamente quando tudo carregar (só uma vez)
  useEffect(() => {
    if (rules.length === 0 || categoriesQuery.isLoading || rulesQuery.isLoading) return;
    setCategorizedTransactions(prev => {
      const jaTemAlguma = prev.some(tx => tx.categoryId);
      if (jaTemAlguma) return prev; // já foi aplicado antes, não repetir
      return aplicarRegras(prev, false);
    });
  }, [rules, categoriesQuery.isLoading, rulesQuery.isLoading]);

  const handleAplicarRegras = () => {
    setCategorizedTransactions(prev => aplicarRegras(prev, false));
  };

  const handleAplicarRegrasForcar = () => {
    setCategorizedTransactions(prev => aplicarRegras(prev, true));
  };

  const handleCategoryChange = (transactionId: string, categoryId: number) => {
    setCategorizedTransactions(prev =>
      prev.map(tx => tx.id === transactionId ? { ...tx, categoryId } : tx)
    );
  };

  const handleApplyToGroup = (categoryId: number, ids: string[]) => {
    setCategorizedTransactions(prev =>
      prev.map(tx => ids.includes(tx.id) ? { ...tx, categoryId } : tx)
    );
    toast.success("Categoria aplicada ao grupo");
  };

  // Permite desmarcar uma transação sinalizada como duplicata (falso positivo) —
  // sem isso, ela nunca poderia ser importada mesmo sendo legítima.
  const handleToggleDuplicate = (transactionId: string) => {
    setCategorizedTransactions(prev =>
      prev.map(tx => tx.id === transactionId ? { ...tx, isDuplicate: !tx.isDuplicate } : tx)
    );
  };

  // ── FIX: Duplicatas sinalizadas NUNCA são enviadas pro salvamento ───────
  // Antes disso, "possível duplicata" era só um aviso visual — se a pessoa
  // clicasse em Salvar sem remover a linha manualmente, a transação era
  // inserida de novo no banco. Agora o filtro é automático; quem quiser
  // importar uma duplicata "falsa" pode desmarcá-la antes (botão na linha).
  const duplicateCount = categorizedTransactions.filter(tx => tx.isDuplicate).length;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toImport = categorizedTransactions.filter(tx => !tx.isDuplicate);
      const skipped = categorizedTransactions.length - toImport.length;
      if (skipped > 0) {
        toast.info(`${skipped} transação(ões) marcada(s) como duplicata foram ignoradas`);
      }
      onCategoriesApplied(toImport);
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return "Selecionar categoria";
    return categories.find((c: any) => c.id === categoryId)?.name || "Desconhecida";
  };

  const getCategoryColor = (categoryId?: number) => {
    if (!categoryId) return "#e5e7eb";
    return categories.find((c: any) => c.id === categoryId)?.color || "#e5e7eb";
  };

  // Faturas de cartão vêm com 3 grupos, lidos direto do que está escrito na
  // fatura: créditos/estornos (aiType "income" — dinheiro voltando) sempre
  // ganham prioridade sobre o resto, depois parceladas (installments > 1),
  // depois compras à vista do mês. Extratos bancários continuam com a
  // divisão antiga (mês atual vs. parcela carregada de fatura anterior).
  const isCard = entityType === "creditCard";
  const creditos = isCard ? categorizedTransactions.filter(tx => tx.aiType === "income") : [];
  const currentMonth = categorizedTransactions.filter(tx =>
    isCard ? tx.aiType !== "income" && !tx.isInstallment : !tx.isInstallment
  );
  const installments = categorizedTransactions.filter(tx =>
    isCard ? tx.aiType !== "income" && tx.isInstallment : tx.isInstallment
  );
  const categorizedCount = categorizedTransactions.filter(tx => tx.categoryId).length;
  const totalCount = categorizedTransactions.length;
  const isLoading = categoriesQuery.isLoading || rulesQuery.isLoading;

  const TransactionRow = ({ transaction }: { transaction: TransactionWithCategory }) => (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        transaction.isDuplicate ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100"
      }`}
    >
      <div
        className="flex items-center justify-between cursor-pointer gap-3"
        onClick={() => setExpandedId(expandedId === transaction.id ? null : transaction.id)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">{transaction.date}</span>
            {(transaction.installments ?? 1) > 1 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                {transaction.currentInstallment ?? 1}/{transaction.installments}
              </span>
            )}
            {transaction.isDuplicate && (
              <>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Duplicada — não será importada
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleDuplicate(transaction.id); }}
                  className="text-xs text-blue-600 underline hover:text-blue-800"
                  title="Marcar como não sendo duplicata, pra importar mesmo assim"
                >
                  não é duplicata
                </button>
              </>
            )}
          </div>
          <p className="text-sm font-medium truncate mt-0.5">{transaction.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-semibold text-sm">
            R$ {parseFloat(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
          <div
            className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 min-w-36 justify-between"
            style={{
              backgroundColor: transaction.categoryId ? getCategoryColor(transaction.categoryId) : "#f3f4f6",
              color: transaction.categoryId ? "#fff" : "#6b7280",
            }}
          >
            <span className="truncate">{getCategoryName(transaction.categoryId)}</span>
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          </div>
        </div>
      </div>

      {expandedId === transaction.id && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Selecione uma categoria:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {categories.map((category: any) => (
              <button
                key={category.id}
                onClick={() => { handleCategoryChange(transaction.id, category.id); setExpandedId(null); }}
                className={`p-2 rounded-lg text-xs font-medium transition-all text-left ${
                  transaction.categoryId === category.id ? "ring-2 ring-offset-1 ring-gray-400" : "hover:opacity-80"
                }`}
                style={{ backgroundColor: category.color, color: "#fff" }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const SectionHeader = ({
    title, count, categorized, transactions: txs, color,
  }: {
    title: string; count: number; categorized: number;
    transactions: TransactionWithCategory[]; color: string;
  }) => (
    <div className={`rounded-lg p-3 mb-3 flex items-center justify-between ${color}`}>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs opacity-75">{categorized} de {count} categorizadas</p>
      </div>
      <div className="flex gap-1 flex-wrap justify-end">
        {categories.slice(0, 3).map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => handleApplyToGroup(cat.id, txs.map(t => t.id))}
            className="text-xs px-2 py-1 rounded-full font-medium opacity-90 hover:opacity-100"
            style={{ backgroundColor: cat.color, color: "#fff" }}
          >
            {cat.name}
          </button>
        ))}
        {categories.length > 3 && (
          <span className="text-xs self-center opacity-60">+{categories.length - 3}</span>
        )}
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-sm">Carregando regras de categorização...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-semibold">Categorizar Transações</h2>
              <p className="text-sm text-muted-foreground">
                {categorizedCount} de {totalCount} categorizada(s)
                {rules.length > 0 && (
                  <span className="ml-2 text-green-600">• {rules.length} regra(s)</span>
                )}
                {duplicateCount > 0 && (
                  <span className="ml-2 text-amber-600">
                    • {duplicateCount} duplicata(s) — não serão importadas
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Botão aplicar regras */}
              <Button
                variant="outline"
                onClick={handleAplicarRegras}
                disabled={rules.length === 0}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                title="Aplica regras nas transações sem categoria"
              >
                <Zap className="h-4 w-4 mr-2" />
                Aplicar Regras
              </Button>
              <Button
                variant="outline"
                onClick={handleAplicarRegrasForcar}
                disabled={rules.length === 0}
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                title="Reaplica regras em TODAS, sobrescrevendo categorias manuais"
              >
                <Zap className="h-4 w-4 mr-2" />
                Forçar Regras
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar e Importar"}
              </Button>
            </div>
          </div>

          {/* Compras do mês */}
          {currentMonth.length > 0 && (
            <div>
              <SectionHeader
                title="🛍️ Compras do mês"
                count={currentMonth.length}
                categorized={currentMonth.filter(t => t.categoryId).length}
                transactions={currentMonth}
                color="bg-blue-50 border border-blue-200"
              />
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {currentMonth.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
              </div>
            </div>
          )}

          {/* Parcelas */}
          {installments.length > 0 && (
            <div className="mt-4">
              <SectionHeader
                title="📅 Parcelas em andamento"
                count={installments.length}
                categorized={installments.filter(t => t.categoryId).length}
                transactions={installments}
                color="bg-orange-50 border border-orange-200"
              />
              <p className="text-xs text-muted-foreground mb-2 px-1">
                Compras parceladas de meses anteriores nesta fatura.
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {installments.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
              </div>
            </div>
          )}

          {/* Créditos / Estornos (só faz sentido em fatura de cartão) */}
          {creditos.length > 0 && (
            <div className="mt-4">
              <SectionHeader
                title="💰 Créditos / Estornos"
                count={creditos.length}
                categorized={creditos.filter(t => t.categoryId).length}
                transactions={creditos}
                color="bg-green-50 border border-green-200"
              />
              <p className="text-xs text-muted-foreground mb-2 px-1">
                Estornos, cashback e cancelamentos identificados na fatura — dinheiro voltando, reduzem o total.
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {creditos.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm flex items-center justify-between">
            <p className="text-muted-foreground">
              <strong>{categorizedCount}</strong> de <strong>{totalCount}</strong> categorizadas
            </p>
            {categorizedCount < totalCount && (
              <p className="text-amber-600 text-xs">
                ⚠️ Todas precisam de categoria antes de salvar
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
