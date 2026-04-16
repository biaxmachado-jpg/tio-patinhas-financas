"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown, Save, X } from "lucide-react";
import { toast } from "sonner";

export interface TransactionWithCategory {
  id: string;
  date: string;
  description: string;
  amount: string;
  categoryId?: number;
  isDuplicate?: boolean;
}

interface TransactionCategorizerProps {
  transactions: TransactionWithCategory[];
  onCategoriesApplied: (categorizedTransactions: TransactionWithCategory[]) => void;
  onCancel: () => void;
}

export function TransactionCategorizer({
  transactions,
  onCategoriesApplied,
  onCancel,
}: TransactionCategorizerProps) {
  const categoriesQuery = trpc.categories.list.useQuery();
  const [categorizedTransactions, setCategorizedTransactions] = useState<TransactionWithCategory[]>(
    transactions
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const categories = categoriesQuery.data || [];

  const handleCategoryChange = (transactionId: string, categoryId: number) => {
    setCategorizedTransactions((prev) =>
      prev.map((tx) =>
        tx.id === transactionId ? { ...tx, categoryId } : tx
      )
    );
  };

  const handleApplyToAll = (categoryId: number) => {
    setCategorizedTransactions((prev) =>
      prev.map((tx) => ({ ...tx, categoryId }))
    );
    toast.success("Categoria aplicada a todas as transações");
  };

  const handleSave = async () => {
    // Validate that all transactions have categories
    const uncategorized = categorizedTransactions.filter((tx) => !tx.categoryId);
    if (uncategorized.length > 0) {
      toast.error(`${uncategorized.length} transação(ões) sem categoria`);
      return;
    }

    setIsSaving(true);
    try {
      onCategoriesApplied(categorizedTransactions);
      toast.success("Categorias aplicadas com sucesso!");
    } catch (error) {
      toast.error("Erro ao aplicar categorias");
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

  const categorizedCount = categorizedTransactions.filter((tx) => tx.categoryId).length;
  const totalCount = categorizedTransactions.length;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Categorizar Transações</h2>
            <p className="text-sm text-muted-foreground">
              {categorizedCount} de {totalCount} categorizada(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
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

        {/* Quick actions */}
        {categories.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-2">Aplicar categoria a todas:</p>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 5).map((category: any) => (
                <Button
                  key={category.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyToAll(category.id)}
                  style={{
                    borderColor: category.color,
                    color: category.color,
                  }}
                >
                  {category.name}
                </Button>
              ))}
              {categories.length > 5 && (
                <span className="text-sm text-muted-foreground self-center">
                  +{categories.length - 5} mais
                </span>
              )}
            </div>
          </div>
        )}

        {/* Transactions list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {categorizedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className={`border rounded-lg p-3 transition-colors ${
                transaction.isDuplicate ? "bg-amber-50 border-amber-200" : "bg-white"
              }`}
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === transaction.id ? null : transaction.id)
                }
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{transaction.date}</span>
                    {transaction.isDuplicate && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                        Duplicada
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {transaction.description}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-right min-w-20">
                    R$ {parseFloat(transaction.amount).toFixed(2)}
                  </span>
                  <div
                    className="px-3 py-1 rounded text-sm font-medium flex items-center gap-1 min-w-40"
                    style={{
                      backgroundColor: getCategoryColor(transaction.categoryId),
                      color: transaction.categoryId ? "#fff" : "#666",
                    }}
                  >
                    <span className="flex-1 text-left">
                      {getCategoryName(transaction.categoryId)}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Expanded category selector */}
              {expandedId === transaction.id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Selecione uma categoria:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {categories.map((category: any) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          handleCategoryChange(transaction.id, category.id);
                          setExpandedId(null);
                        }}
                        className={`p-2 rounded text-sm font-medium transition-all ${
                          transaction.categoryId === category.id
                            ? "ring-2 ring-offset-2"
                            : "hover:opacity-80"
                        }`}
                        style={{
                          backgroundColor: category.color,
                          color: "#fff",
                        } as React.CSSProperties}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 p-3 rounded-lg text-sm">
          <p className="text-muted-foreground">
            <strong>{categorizedCount}</strong> de <strong>{totalCount}</strong> transações
            categorizada(s)
          </p>
          {categorizedCount < totalCount && (
            <p className="text-amber-600 text-xs mt-1">
              ⚠️ Todas as transações precisam de categoria antes de salvar
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
