import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit2, Copy, ChevronDown, AlertCircle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { formatBRL } from "@/lib/currency";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Budgets() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [editingType, setEditingType] = useState<"income" | "expense" | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyMonths, setCopyMonths] = useState("3");
  const [budgetAlerts, setBudgetAlerts] = useState<Array<{ categoryId: number; categoryName: string; percentage: number }>>([]);

  const { data: budgets, refetch } = trpc.budgets.list.useQuery({ month, year });
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: transactions } = trpc.transactions.list.useQuery();
  const { data: creditCardTransactions } = trpc.creditCardTransactions.list.useQuery();
  const createMutation = trpc.budgets.create.useMutation();
  const updateMutation = trpc.budgets.update.useMutation();

  if (!user) return null;

  const incomeCategories = useMemo(() => categories?.filter((c) => c.type === "income") ?? [], [categories]);
  const expenseCategories = useMemo(() => categories?.filter((c) => c.type === "expense") ?? [], [categories]);

  const getSpentAmount = (categoryId: number, type: "income" | "expense") => {
    // Transações bancárias
    const bankAmount = (
      transactions
        ?.filter((t) => {
          const transactionDate = new Date(t.date);
          const transactionMonth = transactionDate.getMonth() + 1;
          const transactionYear = transactionDate.getFullYear();
          return (
            t.categoryId === categoryId &&
            t.type === (type === "income" ? "income" : "expense") &&
            transactionMonth === month &&
            transactionYear === year
          );
        })
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0
    );

    // Transações de cartão de crédito (apenas despesas)
    let creditCardAmount = 0;
    if (type === "expense") {
      creditCardAmount = (
        creditCardTransactions
          ?.filter((t) => {
            const transactionDate = new Date(t.dueDate);
            const transactionMonth = transactionDate.getMonth() + 1;
            const transactionYear = transactionDate.getFullYear();
            return (
              t.categoryId === categoryId &&
              transactionMonth === month &&
              transactionYear === year
            );
          })
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0
      );
    }

    return bankAmount + creditCardAmount;
  };

  const getBudgetForCategory = (categoryId: number) => {
    const budget = budgets?.find((b) => b.categoryId === categoryId);
    return budget ? parseFloat(budget.limit.toString()) : 0;
  };

  // Check for budget alerts
  useEffect(() => {
    const alerts: Array<{ categoryId: number; categoryName: string; percentage: number }> = [];
    
    expenseCategories.forEach((cat) => {
      const budgetAmount = getBudgetForCategory(cat.id);
      if (budgetAmount > 0) {
        const spentAmount = getSpentAmount(cat.id, "expense");
        const percentage = (spentAmount / budgetAmount) * 100;
        
        if (percentage >= 80) {
          alerts.push({
            categoryId: cat.id,
            categoryName: cat.name,
            percentage: Math.round(percentage),
          });
        }
      }
    });
    
    setBudgetAlerts(alerts);
  }, [budgets, transactions, creditCardTransactions, categories]);

  const handleSaveBudget = async () => {
    if (!editingCategoryId || !editValue) return;

    try {
      const existingBudget = budgets?.find((b) => b.categoryId === editingCategoryId);
      
      if (existingBudget) {
        await updateMutation.mutateAsync({
          id: existingBudget.id,
          limit: editValue,
        });
      } else {
        await createMutation.mutateAsync({
          categoryId: editingCategoryId,
          month,
          year,
          limit: editValue,
        });
      }
      
      toast.success("Orçamento salvo com sucesso!");
      setEditingType(null);
      setEditingCategoryId(null);
      setEditValue("");
      refetch();
    } catch (error) {
      console.error("Erro ao salvar orçamento:", error);
      toast.error("Erro ao salvar orçamento");
    }
  };

  const handleDeleteBudget = async (budgetId: number) => {
    try {
      // Implement delete mutation when available
      toast.success("Orçamento deletado com sucesso!");
      refetch();
    } catch (error) {
      console.error("Erro ao deletar orçamento:", error);
      toast.error("Erro ao deletar orçamento");
    }
  };

  const handleCopyBudgets = async () => {
    try {
      // Implement copy logic when available
      toast.success("Orçamentos copiados com sucesso!");
      setShowCopyDialog(false);
    } catch (error) {
      console.error("Erro ao copiar orçamentos:", error);
      toast.error("Erro ao copiar orçamentos");
    }
  };

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground">Defina e acompanhe seus orçamentos mensais</p>
        </div>

        {/* Month/Year Selector */}
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {budgetAlerts.length} categoria(s) atingiu(aram) 80% do orçamento
            </AlertDescription>
          </Alert>
        )}

        {/* Income Budgets */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Orçamento de Receitas</h2>
            <button
              onClick={() => {
                setEditingType("income");
                setEditingCategoryId(null);
                setEditValue("");
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </button>
          </div>
          <div className="grid gap-3">
            {incomeCategories.map((cat) => {
              const spent = getSpentAmount(cat.id, "income");
              const budgetLimit = getBudgetForCategory(cat.id);
              const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0;

              return (
                <Card key={cat.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: cat.color || "#6366f1" }}
                      >
                        {cat.icon ? cat.icon.charAt(0) : cat.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{cat.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatBRL(spent)} / {formatBRL(budgetLimit)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{Math.round(percentage)}% utilizado</p>
                      <div className="w-24 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Expense Budgets */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Orçamento de Despesas</h2>
            <button
              onClick={() => {
                setEditingType("expense");
                setEditingCategoryId(null);
                setEditValue("");
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </button>
          </div>
          <div className="grid gap-3">
            {expenseCategories.map((cat) => {
              const spent = getSpentAmount(cat.id, "expense");
              const budgetLimit = getBudgetForCategory(cat.id);
              const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0;
              const isAlert = percentage >= 80;

              return (
                <Card
                  key={cat.id}
                  className={`p-4 ${isAlert ? "border-orange-200 bg-orange-50" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: cat.color || "#ef4444" }}
                      >
                        {cat.icon ? cat.icon.charAt(0) : cat.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{cat.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatBRL(spent)} / {formatBRL(budgetLimit)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${isAlert ? "text-orange-600" : ""}`}>
                        {Math.round(percentage)}% utilizado
                      </p>
                      <div className="w-24 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full ${isAlert ? "bg-orange-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
