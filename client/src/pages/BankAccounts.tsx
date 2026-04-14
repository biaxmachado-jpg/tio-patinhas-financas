import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { formatBRL } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, Palette } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Paleta de cores predefinidas para contas
const PRESET_COLORS = [
  "#3b82f6", // azul
  "#6366f1", // índigo
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#ef4444", // vermelho
  "#f97316", // laranja
  "#eab308", // amarelo
  "#22c55e", // verde
  "#14b8a6", // teal
  "#06b6d4", // ciano
  "#64748b", // cinza-azulado
  "#78716c", // marrom
];

export default function BankAccounts() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bank: "",
    accountNumber: "",
    initialBalance: "0.00",
    color: "#3b82f6",
  });

  const { data: accounts, refetch } = trpc.bankAccounts.list.useQuery();
  const createMutation = trpc.bankAccounts.create.useMutation();

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        bank: formData.bank,
        accountNumber: formData.accountNumber,
        initialBalance: formData.initialBalance,
        color: formData.color,
      });
      toast.success("Conta criada com sucesso!");
      setOpen(false);
      setFormData({ name: "", bank: "", accountNumber: "", initialBalance: "0.00", color: "#3b82f6" });
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar conta");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Contas Bancárias</h1>
            <p className="text-muted-foreground text-sm md:text-base">Gerencie suas contas bancárias</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nova Conta</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Conta Bancária</DialogTitle>
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
                  <Label htmlFor="initialBalance">Saldo Inicial (Opcional)</Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value || "0.00" })}
                  />
                </div>

                {/* Seletor de Cor */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Cor do Cartão
                  </Label>
                  <div className="mt-2 space-y-3">
                    {/* Paleta de cores */}
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                            formData.color === color ? "border-foreground scale-110 shadow-lg" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    {/* Input de cor personalizada */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border border-border shadow-sm flex-shrink-0"
                        style={{ backgroundColor: formData.color }}
                      />
                      <Input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full h-10 cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {formData.color}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-lg overflow-hidden border border-border">
                  <div
                    className="p-3 text-white text-sm font-semibold"
                    style={{ backgroundColor: formData.color }}
                  >
                    {formData.name || "Nome da Conta"} — {formData.bank || "Banco"}
                  </div>
                  <div className="p-3 bg-card text-xs text-muted-foreground">
                    Preview do cartão
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Criar Conta
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {accounts?.map((account) => {
            const cardColor = (account as any).color || "#3b82f6";
            return (
              <div
                key={account.id}
                className="rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/contas/${account.id}`)}
              >
                {/* Header colorido */}
                  <div
                    className="p-4 text-white"
                    style={{ backgroundColor: cardColor }}
                  >
                    <h3 className="font-semibold text-base">{account.name}</h3>
                    <p className="text-sm text-white/80">{account.bank}</p>
                  </div>

                {/* Conteúdo */}
                <div className="p-4 bg-card">
                  {account.accountNumber && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Conta: {account.accountNumber}
                    </p>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground mt-0.5">
                      {formatBRL(parseFloat(account.balance))}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {accounts?.length === 0 && (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground mb-4">Nenhuma conta criada ainda</p>
            <Button onClick={() => setOpen(true)}>Criar primeira conta</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
