import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit2, AlertCircle, X, ChevronLeft, ChevronRight, Download, Copy } from "lucide-react";
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
  const [budgetValues, setBudgetValues] = useState<Record<number, string>>({});
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

  const handleOpenEditDialog = (type: "income" | "expense") => {
    setEditingType(type);
    const categoriesToEdit = type === "income" ? incomeCategories : expenseCategories;
    const values: Record<number, string> = {};
    categoriesToEdit.forEach((cat) => {
      const budget = getBudgetForCategory(cat.id);
      values[cat.id] = budget > 0 ? budget.toString() : "";
    });
    setBudgetValues(values);
  };

  const handleCloseEditDialog = () => {
    setEditingType(null);
    setBudgetValues({});
  };

  const handleRepeatFor12Months = async (categoryId: number, value: string) => {
    try {
      if (!value || value === "") {
        toast.error("Digite um valor antes de repetir");
        return;
      }

      const currentMonth = month;
      const currentYear = year;

      for (let i = 0; i < 12; i++) {
        let targetMonth = currentMonth + i;
        let targetYear = currentYear;

        if (targetMonth > 12) {
          targetMonth = targetMonth - 12;
          targetYear += 1;
        }

        const existingBudget = budgets?.find(
          (b) => b.categoryId === categoryId && b.month === targetMonth && b.year === targetYear
        );

        if (existingBudget) {
          await updateMutation.mutateAsync({
            id: existingBudget.id,
            limit: value,
          });
        } else {
          await createMutation.mutateAsync({
            categoryId,
            month: targetMonth,
            year: targetYear,
            limit: value,
          });
        }
      }

      toast.success("Orçamento repetido para os próximos 12 meses!");
      refetch();
    } catch (error) {
      console.error("Erro ao repetir orçamento:", error);
      toast.error("Erro ao repetir orçamento");
    }
  };

  const handleSaveAllBudgets = async () => {
    try {
      const categoriesToEdit = editingType === "income" ? incomeCategories : expenseCategories;
      
      for (const cat of categoriesToEdit) {
        const value = budgetValues[cat.id];
        if (value && value !== "") {
          const existingBudget = budgets?.find((b) => b.categoryId === cat.id);
          
          if (existingBudget) {
            await updateMutation.mutateAsync({
              id: existingBudget.id,
              limit: value,
            });
          } else {
            await createMutation.mutateAsync({
              categoryId: cat.id,
              month,
              year,
              limit: value,
            });
          }
        }
      }
      
      toast.success("Orçamentos salvos com sucesso!");
      handleCloseEditDialog();
      refetch();
    } catch (error) {
      console.error("Erro ao salvar orçamentos:", error);
      toast.error("Erro ao salvar orçamentos");
    }
  };

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i);

  const getEditingCategories = () => {
    return editingType === "income" ? incomeCategories : expenseCategories;
  };

  const handlePreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleExportXLSX = async () => {
    try {
      const XLSX = await import('xlsx');
      
      const incomeData = incomeCategories.map(cat => ({
        Categoria: cat.name,
        Realizado: getSpentAmount(cat.id, "income"),
        Orcamento: getBudgetForCategory(cat.id),
        Tipo: "Receita"
      }));

      const expenseData = expenseCategories.map(cat => ({
        Categoria: cat.name,
        Realizado: getSpentAmount(cat.id, "expense"),
        Orcamento: getBudgetForCategory(cat.id),
        Tipo: "Despesa"
      }));

      const allData = [...incomeData, ...expenseData];

      const ws = XLSX.utils.json_to_sheet(allData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Orcamentos ${months[month - 1]} ${year}`);

      XLSX.writeFile(wb, `orcamentos_${months[month - 1]}_${year}.xlsx`);
      
      toast.success("Orcamentos exportados com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar orcamentos");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
          <h1 className="text-3xl font-bold">Orçado x Real</h1>
          <p className="text-muted-foreground">Defina e acompanhe seus orçamentos mensais</p>
          </div>
          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Exportar XLSX
          </button>
        </div>

        {/* Month/Year Selector with Navigation */}
        <div className="flex gap-2 items-center">
          <button
            onClick={handlePreviousMonth}
            className="p-2 border rounded-md hover:bg-gray-100"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
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
          <button
            onClick={handleNextMonth}
            className="p-2 border rounded-md hover:bg-gray-100"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
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
              onClick={() => handleOpenEditDialog("income")}
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
              onClick={() => handleOpenEditDialog("expense")}
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

      {/* Edit Dialog */}
      <Dialog open={editingType !== null} onOpenChange={(open) => !open && handleCloseEditDialog()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>
                Editar Orçamento de {editingType === "income" ? "Receitas" : "Despesas"}
              </DialogTitle>
              <button
                onClick={handleCloseEditDialog}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {getEditingCategories().map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                <div
                  className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: cat.color || "#6366f1" }}
                >
                  {cat.icon ? cat.icon.charAt(0) : cat.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{cat.name}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={budgetValues[cat.id] || ""}
                    onChange={(e) => setBudgetValues({ ...budgetValues, [cat.id]: e.target.value })}
                    className="w-32 text-right"
                    step="0.01"
                    min="0"
                  />
                  <button
                    onClick={() => handleRepeatFor12Months(cat.id, budgetValues[cat.id] || "")}
                    className="p-2 border rounded-md hover:bg-gray-100 text-xs font-medium whitespace-nowrap flex items-center gap-1"
                    title="Repetir este valor para os próximos 12 meses"
                  >
                    <Copy className="w-3 h-3" />
                    Repetir 12m
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <button
              onClick={handleCloseEditDialog}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAllBudgets}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
