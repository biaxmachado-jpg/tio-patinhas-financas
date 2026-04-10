import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatBRL } from "@shared/const";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Edit2, Plus, CreditCard, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const CARD_BRANDS = [
  { value: "Visa", label: "Visa", color: "#1434CB" },
  { value: "Mastercard", label: "Mastercard", color: "#EB001B" },
  { value: "Elo", label: "Elo", color: "#FF6000" },
  { value: "American Express", label: "American Express", color: "#006FCF" },
  { value: "Hipercard", label: "Hipercard", color: "#CC0000" },
  { value: "Discover", label: "Discover", color: "#FF6000" },
];

export default function CreditCards() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    brand: "Visa",
    lastFourDigits: "",
    limit: "0.00",
    dueDay: "10",
    closingDay: "1",
    color: "#1434CB",
  });

  const cardsQuery = trpc.creditCards.list.useQuery();
  const createMutation = trpc.creditCards.create.useMutation();
  const updateMutation = trpc.creditCards.update.useMutation();
  const deleteMutation = trpc.creditCards.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          name: formData.name,
          brand: formData.brand,
          lastFourDigits: formData.lastFourDigits,
          limit: formData.limit,
          dueDay: parseInt(formData.dueDay),
          closingDay: parseInt(formData.closingDay),
          color: formData.color,
        });
        toast.success("Cartão atualizado com sucesso!");
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          brand: formData.brand,
          lastFourDigits: formData.lastFourDigits,
          limit: formData.limit,
          dueDay: parseInt(formData.dueDay),
          closingDay: parseInt(formData.closingDay),
          color: formData.color,
        });
        toast.success("Cartão criado com sucesso!");
      }

      await cardsQuery.refetch();
      setOpen(false);
      setEditingId(null);
      setFormData({
        name: "",
        brand: "Visa",
        lastFourDigits: "",
        limit: "0.00",
        dueDay: "10",
        closingDay: "1",
        color: "#1434CB",
      });
    } catch (error) {
      toast.error("Erro ao salvar cartão");
    }
  };

  const handleEdit = (card: any) => {
    setEditingId(card.id);
    setFormData({
      name: card.name,
      brand: card.brand,
      lastFourDigits: card.lastFourDigits || "",
      limit: card.limit,
      dueDay: card.dueDay.toString(),
      closingDay: card.closingDay.toString(),
      color: card.color || "#1434CB",
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      await cardsQuery.refetch();
      toast.success("Cartão deletado com sucesso!");
    } catch (error) {
      toast.error("Erro ao deletar cartão");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setEditingId(null);
      setFormData({
        name: "",
        brand: "Visa",
        lastFourDigits: "",
        limit: "0.00",
        dueDay: "10",
        closingDay: "1",
        color: "#1434CB",
      });
    }
  };

  const totalLimit = cardsQuery.data?.reduce((sum: number, card: any) => sum + parseFloat(card.limit.toString()), 0) || 0;

  const getBrandColor = (brand: string) => {
    const brandData = CARD_BRANDS.find(b => b.value === brand);
    return brandData?.color || "#999";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cartões de Crédito</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus cartões e limites</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Cartão" : "Novo Cartão de Crédito"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Cartão</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cartão Master"
                  required
                />
              </div>

              <div>
                <Label htmlFor="brand">Bandeira</Label>
                <Select value={formData.brand} onValueChange={(value) => setFormData({ ...formData, brand: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_BRANDS.map((brand) => (
                      <SelectItem key={brand.value} value={brand.value}>
                        {brand.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="lastFourDigits">Últimos 4 Dígitos</Label>
                <Input
                  id="lastFourDigits"
                  placeholder="ex: 1234"
                  value={formData.lastFourDigits}
                  onChange={(e) => setFormData({ ...formData, lastFourDigits: e.target.value.slice(0, 4) })}
                />
              </div>

              <div>
                <Label htmlFor="limit">Limite (R$)</Label>
                <Input
                  id="limit"
                  type="number"
                  step="0.01"
                  value={formData.limit}
                  onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="dueDay">Dia do Vencimento</Label>
                <Input
                  id="dueDay"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dueDay}
                  onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                  placeholder="10"
                  required
                />
              </div>

              <div>
                <Label htmlFor="closingDay">Dia do Fechamento</Label>
                <Input
                  id="closingDay"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.closingDay}
                  onChange={(e) => setFormData({ ...formData, closingDay: e.target.value })}
                  placeholder="1"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                {editingId ? "Atualizar" : "Criar"} Cartão
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Limit */}
      {cardsQuery.data && cardsQuery.data.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Limite Total</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {formatBRL(totalLimit)}
              </p>
            </div>
            <CreditCard className="w-12 h-12 text-purple-300 dark:text-purple-700" />
          </div>
        </Card>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardsQuery.data?.map((card: any) => {
          const brandColor = getBrandColor(card.brand);
          return (
            <Card
              key={card.id}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/cartoes/${card.id}`)}
            >
              {/* Brand Header */}
              <div
                className="p-4 text-white"
                style={{ backgroundColor: brandColor }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{card.name}</h3>
                    <p className="text-sm text-white/80">{card.brand}</p>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {card.lastFourDigits && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Cartão: ****{card.lastFourDigits}
                  </p>
                )}

                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">Limite</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatBRL(card.limit)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                  <div>
                    <p className="text-muted-foreground">Vencimento</p>
                    <p className="font-semibold">{card.dueDay}º</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fechamento</p>
                    <p className="font-semibold">{card.closingDay}º</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(card);
                    }}
                    className="flex-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(card.id);
                    }}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {!cardsQuery.data?.length && (
        <Card className="p-12 text-center">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum cartão cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">Clique em "Novo Cartão" para adicionar seu primeiro cartão</p>
        </Card>
      )}
    </div>
  );
}
