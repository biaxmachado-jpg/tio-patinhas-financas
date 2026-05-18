"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown, Save, X, Tag, AlertCircle, CreditCard, Clock } from "lucide-react";
import { toast } from "sonner";

export interface TransactionWithCategory {
  id: string;
  date: string;
  description: string;
  amount: string;
  categoryId?: number;
  isDuplicate?: boolean;
  isInstallment?: boolean; // parcela de mês anterior
}

interface TransactionCategorizerProps {
  transactions: TransactionWithCategory[];
  onCategoriesApplied: (categorizedTransactions: TransactionWithCategory[]) => void;
  onCancel: () => void;
}

// Aplica regras de categorização a uma descrição
function applyRules(description: string, rules: any[]): number | null {
  const sorted = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  for (const rule of sorted) {
    if (!rule.enabled) continue;
    let keywords: string[] = [];
    try {
      keywords = typeof rule.keywords === "string" ? JSON.parse(rule.keywords) : rule.keywords;
    } catch { continue; }

    const testStr = rule.caseSensitive ? description : description.toLowerCase();
    for (const kw of keywords) {
      const testKw = rule.caseSensitive ? kw : kw.toLowerCase();
      switch (rule.matchType) {
        case "contains":    if (testStr.includes(testKw)) return rule.categoryId; break;
        case "exact":       if (testStr === testKw) return rule.categoryId; break;
        case "startsWith":  if (testStr.startsWith(testKw)) return rule.categoryId; break;
        case "endsWith":    if (testStr.endsWith(testKw)) return rule.categoryId; break;
      }
    }
  }
  return null;
}

export function TransactionCategorizer({
  transactions,
  onCategoriesApplied,
  onCancel,
}: TransactionCategorizerProps) {
  const categoriesQuery = trpc.categories.list.useQuery();
  const rulesQuery = trpc.categorizationRules.list.useQuery();

  const [categorizedTransactions, setCategorizedTransactions] = useState<TransactionWithCategory[]>(transactions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [rulesApplied, setRulesApplied] = useState(false);

  const categories = categoriesQuery.data || [];
  const rules = rulesQuery.data || [];

  // Aplicar regras automaticamente quando carregarem
  useEffect(() => {
    if (rules.length === 0 || rulesApplied) return;

    let autoCount = 0;
    const withRules = categorizedTransactions.map(tx => {
      if (tx.categoryId) return tx; // já tem categoria, não sobrescreve
      const matched = applyRules(tx.description, rules);
      if (matched) { autoCount++; return { ...tx, categoryId: matched }; }
      return tx;
    });

    if (autoCount > 0) {
      setCategorizedTransactions(withRules);
      toast.success(`${autoCount} transação(ões) categorizadas automaticamente pelas suas regras`);
    }
    setRulesApplied(true);
  }, [rules, rulesApplied]);

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

  const handleSave = async () => {
    const uncategorized = categorizedTransactions.filter(tx => !tx.categoryId);
    if (uncategorized.length > 0) {
      toast.error(`${uncategorized.length} transação(ões) sem categoria`);
      return;
    }
    setIsSaving(true);
    try {
      onCategoriesApplied(categorizedTransactions);
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

  // Separar em grupos
  const currentMonth = categorizedTransactions.filter(tx => !tx.isInstallment);
  const installments = categorizedTransactions.filter(tx => tx.isInstallment);

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
            <span className="text-xs text-muted-foreground font-mono">
              {transaction.date}
            </span>
            {transaction.isDuplicate && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Duplicada
              </span>
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
                onClick={() => {
                  handleCategoryChange(transaction.id, category.id);
                  setExpandedId(null);
                }}
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
    title,
    icon,
    count,
    categorized,
    transactions: txs,
    color,
  }: {
    title: string;
    icon: React.ReactNode;
    count: number;
    categorized: number;
    transactions: TransactionWithCategory[];
    color: string;
  }) => (
    <div className={`rounded-lg p-3 mb-3 flex items-center justify-between ${color}`}>
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs opacity-75">{categorized} de {count} categorizadas</p>
        </div>
      </div>
      {/* Aplicar categoria a todas do grupo */}
      {categories.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-end">
          {categories.slice(0, 3).map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => handleApplyToGroup(cat.id, txs.map(t => t.id))}
              className="text-xs px-2 py-1 rounded-full font-medium opacity-90 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: cat.color, color: "#fff" }}
            >
              {cat.name}
            </button>
          ))}
          {categories.length > 3 && (
            <span className="text-xs self-center opacity-60">+{categories.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card className="p-6">
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-sm">Aplicando suas regras de categorização...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Categorizar Transações</h2>
              <p className="text-sm text-muted-foreground">
                {categorizedCount} de {totalCount} categorizada(s)
                {rules.length > 0 && (
                  <span className="ml-2 text-green-600">• {rules.length} regra(s) aplicada(s)</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || categorizedCount !== totalCount}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Categorias"}
              </Button>
            </div>
          </div>

          {/* Seção: Compras do mês */}
          {currentMonth.length > 0 && (
            <div>
              <SectionHeader
                title="🛍️ Compras do mês"
                icon={<CreditCard className="h-4 w-4 text-blue-700" />}
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

          {/* Seção: Parcelas de meses anteriores */}
          {installments.length > 0 && (
            <div className="mt-4">
              <SectionHeader
                title="📅 Parcelas em andamento"
                icon={<Clock className="h-4 w-4 text-orange-700" />}
                count={installments.length}
                categorized={installments.filter(t => t.categoryId).length}
                transactions={installments}
                color="bg-orange-50 border border-orange-200"
              />
              <p className="text-xs text-muted-foreground mb-2 px-1">
                Compras parceladas de meses anteriores que aparecem nesta fatura.
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {installments.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm flex items-center justify-between">
            <p className="text-muted-foreground">
              <strong>{categorizedCount}</strong> de <strong>{totalCount}</strong> transações categorizadas
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
