import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { formatBRL } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit2, CheckSquare, Square } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Transactions() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<number>(0);
  const [formData, setFormData] = useState({
    categoryId: 0,
    accountId: 0,
    type: "expense" as "income" | "expense",
    description: "",
    amount: "0.00",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { data: transactions, refetch } = trpc.transactions.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: accounts } = trpc.bankAccounts.list.useQuery();
  const createMutation = trpc.transactions.create.useMutation();
  const updateMutation = trpc.transactions.update.useMutation();
  const deleteMutation = trpc.transactions.delete.useMutation();

  const handleBulkReclassify = async () => {
    if (selectedIds.size === 0 || bulkCategoryId === 0) {
      toast.error("Selecione transações e uma categoria");
      return;
    }

    try {
      for (const id of Array.from(selectedIds)) {
        const transaction = transactions?.find((t: any) => t.id === id);
        if (transaction) {
          await updateMutation.mutateAsync({
            id,
            categoryId: bulkCategoryId,
            description: transaction.description,
            amount: transaction.amount.toString(),
            date: new Date(transaction.date),
            notes: transaction.notes || "",
          });
        }
      }
      toast.success(`${selectedIds.size} transações reclassificadas!`);
      setSelectedIds(new Set());
      setBulkCategoryId(0);
      setShowBulkDialog(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao reclassificar transações");
    }
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions?.map((t: any) => t.id) || []));
    }
  };

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          categoryId: formData.categoryId,
          description: formData.description,
          amount: formData.amount,
          date: new Date(formData.date),
          notes: formData.notes,
        });
        toast.success("Transação atualizada com sucesso!");
      } else {
        await createMutation.mutateAsync({
          ...formData,
          categoryId: formData.categoryId,
          accountId: formData.accountId,
          date: new Date(formData.date),
        });
        toast.success("Transação criada com sucesso!");
      }
      setOpen(false);
      setEditingId(null);
      setFormData({
        categoryId: 0,
        accountId: 0,
        type: "expense",
        description: "",
        amount: "0.00",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar transação");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Transação deletada com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao deletar transação");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transações</h1>
            <p className="text-muted-foreground">Registre e gerencie suas transações</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Transação" : "Nova Transação"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as "income" | "expense" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.categoryId.toString()} onValueChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.filter((c: any) => c.type === formData.type).map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="account">Conta</Label>
                  <Select value={formData.accountId.toString()} onValueChange={(value) => setFormData({ ...formData, accountId: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id.toString()}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Compra no supermercado"
                    value={formData.description}
                    onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e: any) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e: any) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Input
                    id="notes"
                    placeholder="Notas adicionais (opcional)"
                    value={formData.notes}
                    onChange={(e: any) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingId ? "Atualizar" : "Criar"} Transação
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Transactions Table */}
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Data</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Descrição</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Categoria</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Conta</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Valor</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map((transaction: any) => {
                  const category = categories?.find((c: any) => c.id === transaction.categoryId);
                  const account = accounts?.find((a: any) => a.id === transaction.accountId);
                  return (
                    <tr key={transaction.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3 text-sm text-foreground">
                        {format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-3 text-sm text-foreground">{transaction.description}</td>
                      <td className="px-6 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: category?.color }}
                          />
                          {category?.name}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{account?.name}</td>
                      <td className={`px-6 py-3 text-sm font-semibold text-right ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {transaction.type === "income" ? "+" : "-"} {formatBRL(parseFloat(transaction.amount))}
                      </td>
                      <td className="px-6 py-3 text-sm text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                categoryId: transaction.categoryId,
                                accountId: transaction.accountId,
                                type: transaction.type,
                                description: transaction.description,
                                amount: transaction.amount,
                                date: new Date(transaction.date).toISOString().split("T")[0],
                                notes: transaction.notes || "",
                              });
                              setEditingId(transaction.id);
                              setOpen(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(transaction.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {transactions?.length === 0 && (
          <div className="text-center py-12 card-elevated">
            <p className="text-muted-foreground mb-4">Nenhuma transação registrada</p>
            <Button asChild>
              <a href="#new">Registrar primeira transação</a>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
