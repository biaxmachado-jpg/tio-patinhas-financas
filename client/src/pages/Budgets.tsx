import { Button } from "@/components/ui/button";
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
  const createMutation = trpc.budgets.create.useMutation();
  const updateMutation = trpc.budgets.update.useMutation();

  if (!user) return null;

  const incomeCategories = useMemo(() => categories?.filter((c) => c.type === "income") ?? [], [categories]);
  const expenseCategories = useMemo(() => categories?.filter((c) => c.type === "expense") ?? [], [categories]);

  const getSpentAmount = (categoryId: number, type: "income" | "expense") => {
    return (
      transactions
        ?.filter((t) => t.categoryId === categoryId && t.type === (type === "income" ? "income" : "expense"))
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0
    );
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
  }, [budgets, transactions, categories]);

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
      toast.error("Erro ao salvar orçamento");
    }
  };

  const handleApplyToNextMonths = async () => {
    if (!editingCategoryId || !editValue) return;

    const monthsToApply = parseInt(copyMonths) || 12;
    try {
      // Apply to next N months
      for (let i = 1; i <= monthsToApply; i++) {
        const nextMonth = ((month - 1 + i) % 12) + 1;
        const nextYear = year + Math.floor((month - 1 + i) / 12);
        
        // Check if budget exists for that month
        const existingBudget = budgets?.find(
          (b) => b.categoryId === editingCategoryId && b.month === nextMonth && b.year === nextYear
        );

        if (existingBudget) {
          await updateMutation.mutateAsync({
            id: existingBudget.id,
            limit: editValue,
          });
        } else {
          await createMutation.mutateAsync({
            categoryId: editingCategoryId,
            month: nextMonth,
            year: nextYear,
            limit: editValue,
          });
        }
      }

      toast.success(`Orçamento aplicado aos próximos ${monthsToApply} meses!`);
      setEditingType(null);
      setEditingCategoryId(null);
      setEditValue("");
      setShowCopyDialog(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao aplicar orçamento aos próximos meses");
    }
  };

  const BudgetCard = ({ type, categories: catList }: { type: "income" | "expense"; categories: any[] }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          {type === "income" ? "Orçamento de Receitas" : "Orçamento de Despesas"}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingType(type);
            setEditingCategoryId(catList[0]?.id || 0);
            setEditValue(getBudgetForCategory(catList[0]?.id || 0).toString());
          }}
        >
          <Edit2 className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </div>

      <div className="space-y-4">
        {catList.map((cat) => {
          const budgetAmount = getBudgetForCategory(cat.id);
          const spentAmount = getSpentAmount(cat.id, type);
          const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

          return (
            <div key={cat.id} className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-semibold"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.icon?.charAt(0).toUpperCase() || "•"}
                  </div>
                  <span className="font-medium">{cat.name}</span>
                </div>
                <span className="text-sm font-semibold">
                  {formatBRL(spentAmount)} / {formatBRL(budgetAmount)}
                </span>
              </div>
              <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    percentage >= 100 ? "bg-red-500" : percentage >= 80 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{percentage.toFixed(0)}% utilizado</p>
            </div>
          );
        })}
      </div>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
          <p className="text-muted-foreground">Defina e acompanhe seus orçamentos mensais</p>
        </div>

        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <div className="space-y-2">
            {budgetAlerts.map((alert) => (
              <Alert key={alert.categoryId} className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  <strong>{alert.categoryName}</strong> atingiu <strong>{alert.percentage}%</strong> do orçamento
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Month/Year Selector */}
        <div className="flex gap-4">
          <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {new Date(2024, m - 1).toLocaleString("pt-BR", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Budget Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BudgetCard type="income" categories={incomeCategories} />
          <BudgetCard type="expense" categories={expenseCategories} />
        </div>

        {/* Edit Dialog */}
        <Dialog open={editingType !== null} onOpenChange={(open) => !open && setEditingType(null)}>
          <DialogContent className="max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Editar Orçamento de {editingType === "income" ? "Receitas" : "Despesas"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {(editingType === "income" ? incomeCategories : expenseCategories).map((cat) => (
                <div key={cat.id} className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-semibold"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.icon?.charAt(0).toUpperCase() || "•"}
                    </div>
                    {cat.name}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editingCategoryId === cat.id ? editValue : getBudgetForCategory(cat.id).toString()}
                      onChange={(e) => {
                        setEditingCategoryId(cat.id);
                        setEditValue(e.target.value);
                      }}
                    />
                    {editingCategoryId === cat.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCopyDialog(true)}
                        title="Copiar para próximos meses"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingType(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveBudget}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Copy Dialog */}
        <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Copiar Orçamento para Próximos Meses</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Quantos meses?</Label>
                <Select value={copyMonths} onValueChange={setCopyMonths}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mês</SelectItem>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-medium mb-1">Resumo:</p>
                <p className="text-muted-foreground">
                  Será copiado o orçamento de <strong>{copyMonths} mês(es)</strong> a partir de{" "}
                  <strong>
                    {new Date(year, month - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" })}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleApplyToNextMonths}>Copiar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
