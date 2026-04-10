import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function BankAccounts() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    bank: "",
    accountNumber: "",
    initialBalance: "0.00",
  });

  const { data: accounts, refetch } = trpc.bankAccounts.list.useQuery();
  const createMutation = trpc.bankAccounts.create.useMutation();
  const updateMutation = trpc.bankAccounts.update.useMutation();
  const deleteMutation = trpc.bankAccounts.delete.useMutation();

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Conta atualizada com sucesso!");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Conta criada com sucesso!");
      }
      setOpen(false);
      setEditingId(null);
      setFormData({ name: "", bank: "", accountNumber: "", initialBalance: "0.00" });
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar conta");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Conta deletada com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao deletar conta");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contas Bancárias</h1>
            <p className="text-muted-foreground">Gerencie suas contas bancárias</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Conta" : "Nova Conta Bancária"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Conta</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Conta Corrente"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="bank">Banco</Label>
                  <Input
                    id="bank"
                    placeholder="Ex: Itaú, Bradesco, BRB"
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Número da Conta</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Ex: 123456-7"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="initialBalance">Saldo Inicial</Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingId ? "Atualizar" : "Criar"} Conta
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts?.map((account) => (
            <div key={account.id} className="card-elevated p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{account.name}</h3>
                  <p className="text-sm text-muted-foreground">{account.bank}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        name: account.name,
                        bank: account.bank,
                        accountNumber: account.accountNumber || "",
                        initialBalance: account.balance,
                      });
                      setEditingId(account.id);
                      setOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {account.accountNumber && (
                <p className="text-sm text-muted-foreground">
                  Conta: {account.accountNumber}
                </p>
              )}

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {parseFloat(account.balance).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {accounts?.length === 0 && (
          <div className="text-center py-12 card-elevated">
            <p className="text-muted-foreground mb-4">Nenhuma conta criada ainda</p>
            <Button asChild>
              <a href="#new">Criar primeira conta</a>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
