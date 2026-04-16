import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TransactionActions } from "@/components/TransactionActions";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@shared/const";
import { TransactionType, getTransactionTypeLabel, getTransactionTypeColor, ClassifiedTransaction } from "@/lib/transactionClassifier";
import { useState } from "react";

interface TransactionGroupProps {
  type: TransactionType;
  transactions: ClassifiedTransaction[];
  total: number;
  categories: any[];
  isEditMode: boolean;
  selectedIds: Set<number>;
  onToggleSelection: (id: number) => void;
  onToggleAllSelection: () => void;
  onEditField: (transaction: any, field: string, value: string) => void;
  onDeleteTransaction: (id: number) => void;
  onRefetch: () => void;
}

export function TransactionGroup({
  type,
  transactions,
  total,
  categories,
  isEditMode,
  selectedIds,
  onToggleSelection,
  onToggleAllSelection,
  onEditField,
  onDeleteTransaction,
  onRefetch,
}: TransactionGroupProps) {
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const label = getTransactionTypeLabel(type);
  const color = getTransactionTypeColor(type);

  // Determine icon and styling based on type
  let icon = null;
  let bgColor = "bg-muted/50";
  let textColor = "text-foreground";
  let totalColor = "text-foreground";

  if (type === "vista") {
    icon = <TrendingUp className="w-5 h-5" style={{ color }} />;
    bgColor = "bg-red-50 dark:bg-red-950/20";
    totalColor = "text-red-600 dark:text-red-400";
  } else if (type === "parcelada") {
    icon = <TrendingUp className="w-5 h-5" style={{ color }} />;
    bgColor = "bg-amber-50 dark:bg-amber-950/20";
    totalColor = "text-amber-600 dark:text-amber-400";
  } else if (type === "credito") {
    icon = <TrendingDown className="w-5 h-5" style={{ color }} />;
    bgColor = "bg-green-50 dark:bg-green-950/20";
    totalColor = "text-green-600 dark:text-green-400";
  }

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className={`rounded-lg p-4 ${bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h3 className="font-semibold text-foreground">{label}</h3>
              <p className="text-xs text-muted-foreground">
                {transactions.length} transação{transactions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${totalColor}`}>
              {formatBRL(Math.abs(total))}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {isEditMode && (
                <th className="text-center py-3 px-2 font-medium text-muted-foreground w-10">
                  <Checkbox
                    checked={
                      selectedIds.size > 0 &&
                      transactions.every((t) => selectedIds.has(t.id))
                    }
                    onCheckedChange={onToggleAllSelection}
                  />
                </th>
              )}
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                Data
              </th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                Estabelecimento
              </th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                Categoria
              </th>
              {type === "parcelada" && (
                <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                  Parcelas
                </th>
              )}
              <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                Valor
              </th>
              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                {isEditMode && (
                  <td className="text-center py-3 px-2">
                    <Checkbox
                      checked={selectedIds.has(transaction.id)}
                      onCheckedChange={() => onToggleSelection(transaction.id)}
                    />
                  </td>
                )}
                <td className="py-3 px-2 text-muted-foreground">
                  {format(new Date(transaction.date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </td>
                <td
                  className={`py-3 px-2 text-foreground ${
                    isEditMode ? "cursor-pointer hover:underline" : ""
                  }`}
                  onClick={() => {
                    if (!isEditMode) return;
                    setEditingField("description");
                    setEditingValue(transaction.description);
                    setEditingTransactionId(transaction.id);
                  }}
                >
                  {editingField === "description" &&
                  editingTransactionId === transaction.id ? (
                    <Input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => {
                        onEditField(transaction, "description", editingValue);
                        setEditingField(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onEditField(transaction, "description", editingValue);
                          setEditingField(null);
                        }
                        if (e.key === "Escape") setEditingField(null);
                      }}
                      autoFocus
                      className="h-8"
                    />
                  ) : (
                    transaction.description
                  )}
                </td>
                <td
                  className={`py-3 px-2 text-muted-foreground ${
                    isEditMode ? "cursor-pointer hover:underline" : ""
                  }`}
                  onClick={() => {
                    if (!isEditMode) return;
                    setEditingField("category");
                    setEditingValue(transaction.categoryId?.toString() || "");
                    setEditingTransactionId(transaction.id);
                  }}
                >
                  {editingField === "category" &&
                  editingTransactionId === transaction.id ? (
                    <Select
                      value={editingValue}
                      onValueChange={(value) => {
                        onEditField(transaction, "categoryId", value);
                        setEditingField(null);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    transaction.categoryId
                      ? categories?.find((c: any) => c.id === transaction.categoryId)?.name || "-"
                      : <span className="text-muted-foreground italic">Sem categoria</span>
                  )}
                </td>
                {type === "parcelada" && (
                  <td className="py-3 px-2 text-center text-muted-foreground">
                    {transaction.installments > 1
                      ? `${transaction.currentInstallment}/${transaction.installments}`
                      : "-"}
                  </td>
                )}
                <td
                  className={`py-3 px-2 text-right font-semibold ${
                    type === "credito"
                      ? "text-green-600"
                      : type === "vista"
                        ? "text-red-600"
                        : "text-amber-600"
                  } ${isEditMode ? "cursor-pointer hover:underline" : ""}`}
                  onClick={() => {
                    if (!isEditMode) return;
                    setEditingField("amount");
                    setEditingValue(
                      formatBRL(transaction.amount).replace("R$", "")
                    );
                    setEditingTransactionId(transaction.id);
                  }}
                >
                  {editingField === "amount" &&
                  editingTransactionId === transaction.id ? (
                    <Input
                      type="text"
                      value={editingValue}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.,]/g, "");
                        setEditingValue(value);
                      }}
                      onBlur={() => {
                        onEditField(transaction, "amount", editingValue);
                        setEditingField(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onEditField(transaction, "amount", editingValue);
                          setEditingField(null);
                        }
                        if (e.key === "Escape") setEditingField(null);
                      }}
                      autoFocus
                      className="h-8 text-right"
                    />
                  ) : (
                    formatBRL(transaction.amount)
                  )}
                </td>
                <td className="py-3 px-2 text-center">
                  <TransactionActions
                    transactionId={transaction.id}
                    categoryId={transaction.categoryId}
                    description={transaction.description}
                    dueDate={
                      transaction.dueDate
                        ? new Date(transaction.dueDate)
                        : new Date(transaction.date)
                    }
                    onDelete={() => {
                      onDeleteTransaction(transaction.id);
                      onRefetch();
                    }}
                    onUpdate={() => onRefetch()}
                    onMove={() => onRefetch()}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
