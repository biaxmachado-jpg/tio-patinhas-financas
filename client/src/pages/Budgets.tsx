import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function Budgets() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    categoryId: 0,
    limit: "0.00",
  });

  const { data: budgets, refetch } = trpc.budgets.list.useQuery({ month, year });
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: transactions } = trpc.transactions.list.useQuery();
  const createMutation = trpc.budgets.create.useMutation();
  const updateMutation = trpc.budgets.update.useMutation();
  const deleteMutation = trpc.budgets.delete.useMutation();

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          limit: formData.limit,
        });
        toast.success("Orçamento atualizado com sucesso!");
      } else {
        await createMutation.mutateAsync({
          categoryId: formData.categoryId,
          month,
          year,
          limit: formData.limit,
        });
        toast.success("Orçamento criado com sucesso!");
      }
      setOpen(false);
      setEditingId(null);
      setFormData({ categoryId: 0, limit: "0.00" });
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar orçamento");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Orçamento deletado com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao deletar orçamento");
    }
  };

  const getSpentAmount = (categoryId: number) => {
    return (
      transactions
        ?.filter((t) => t.categoryId === categoryId && t.type === "expense")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0
    );
  };

  const getProgressPercentage = (spent: number, limit: number) => {
    return limit > 0 ? (spent / limit) * 100 : 0;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
            <p className="text-muted-foreground">Defina e acompanhe seus orçamentos mensais</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Orçamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Orçamento" : "Novo Orçamento"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingId && (
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={formData.categoryId.toString()} onValueChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.filter((c) => c.type === "expense").map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor="limit">Limite</Label>
                  <Input
                    id="limit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.limit}
                    onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingId ? "Atualizar" : "Criar"} Orçamento
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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

        {/* Budgets Grid */}
        <div className="space-y-4">
          {budgets?.map((budget) => {
            const category = categories?.find((c) => c.id === budget.categoryId);
            const spent = getSpentAmount(budget.categoryId);
            const limit = parseFloat(budget.limit);
            const percentage = getProgressPercentage(spent, limit);
            const isOverBudget = spent > limit;

            return (
              <div key={budget.id} className="card-elevated p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: category?.color }}
                    >
                      {category?.icon.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{category?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Limite: R$ {limit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          categoryId: budget.categoryId,
                          limit: budget.limit,
                        });
                        setEditingId(budget.id);
                        setOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(budget.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Gasto</span>
                    <span className={`font-semibold ${isOverBudget ? "text-red-600" : "text-foreground"}`}>
                      R$ {spent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} / R${" "}
                      {limit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${getProgressColor(percentage)}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% do orçamento utilizado
                    {isOverBudget && (
                      <span className="text-red-600 font-semibold">
                        {" "}
                        - R$ {(spent - limit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} acima do limite
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {budgets?.length === 0 && (
          <div className="text-center py-12 card-elevated">
            <p className="text-muted-foreground mb-4">Nenhum orçamento criado para este mês</p>
            <Button asChild>
              <a href="#new">Criar primeiro orçamento</a>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
