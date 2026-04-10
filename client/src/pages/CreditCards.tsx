import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, CreditCard as CreditCardIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function CreditCards() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    limit: "0.00",
    dueDay: 10,
    closingDay: 5,
    color: "#3b82f6",
    lastFourDigits: "",
  });

  const { data: cards, refetch } = trpc.creditCards.list.useQuery();
  const createMutation = trpc.creditCards.create.useMutation();
  const updateMutation = trpc.creditCards.update.useMutation();
  const deleteMutation = trpc.creditCards.delete.useMutation();

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Cartão atualizado com sucesso!");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Cartão criado com sucesso!");
      }
      setOpen(false);
      setEditingId(null);
      setFormData({
        name: "",
        brand: "",
        limit: "0.00",
        dueDay: 10,
        closingDay: 5,
        color: "#3b82f6",
        lastFourDigits: "",
      });
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar cartão");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Cartão deletado com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao deletar cartão");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cartões de Crédito</h1>
            <p className="text-muted-foreground">Gerencie seus cartões de crédito</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Cartão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Cartão" : "Novo Cartão de Crédito"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Cartão</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Cartão Master"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="brand">Bandeira</Label>
                  <Input
                    id="brand"
                    placeholder="Ex: Visa, Mastercard, Elo"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    required
                  />
                </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="closingDay">Dia de Fechamento</Label>
                    <Input
                      id="closingDay"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.closingDay}
                      onChange={(e) => setFormData({ ...formData, closingDay: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDay">Dia de Vencimento</Label>
                    <Input
                      id="dueDay"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dueDay}
                      onChange={(e) => setFormData({ ...formData, dueDay: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="color">Cor</Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                      <span className="text-muted-foreground text-sm">{formData.color}</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="lastFourDigits">Últimos 4 Dígitos</Label>
                    <Input
                      id="lastFourDigits"
                      placeholder="1234"
                      maxLength={4}
                      value={formData.lastFourDigits}
                      onChange={(e) => setFormData({ ...formData, lastFourDigits: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingId ? "Atualizar" : "Criar"} Cartão
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards?.map((card) => (
            <div
              key={card.id}
              className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
              style={{ backgroundColor: card.color }}
            >
              {/* Card Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full -ml-16 -mb-16" />
              </div>

              <div className="relative space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm opacity-80">Nome do Cartão</p>
                    <h3 className="text-xl font-bold">{card.name}</h3>
                  </div>
                  <CreditCardIcon className="w-8 h-8 opacity-80" />
                </div>

                <div className="space-y-2">
                  <p className="text-sm opacity-80">Bandeira</p>
                  <p className="font-semibold">{card.brand}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                  <div>
                    <p className="text-xs opacity-80">Limite</p>
                    <p className="font-bold">
                      R$ {parseFloat(card.limit).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs opacity-80">Últimos 4 dígitos</p>
                    <p className="font-bold">{card.lastFourDigits || "****"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4">
                  <div>
                    <p className="text-xs opacity-80">Fechamento</p>
                    <p className="text-sm">Dia {card.closingDay}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-80">Vencimento</p>
                    <p className="text-sm">Dia {card.dueDay}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-white/20">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setFormData({
                        name: card.name,
                        brand: card.brand,
                        limit: card.limit,
                        dueDay: card.dueDay,
                        closingDay: card.closingDay,
                        color: card.color,
                        lastFourDigits: card.lastFourDigits || "",
                      });
                      setEditingId(card.id);
                      setOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDelete(card.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {cards?.length === 0 && (
          <div className="text-center py-12 card-elevated">
            <p className="text-muted-foreground mb-4">Nenhum cartão criado ainda</p>
            <Button asChild>
              <a href="#new">Criar primeiro cartão</a>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
