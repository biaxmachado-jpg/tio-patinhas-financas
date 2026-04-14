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
import { Trash2, Edit2, Plus, CreditCard, ChevronRight, Palette } from "lucide-react";
import { toast } from "sonner";

const CARD_BRANDS = [
  { value: "Visa", label: "Visa" },
  { value: "Mastercard", label: "Mastercard" },
  { value: "Elo", label: "Elo" },
  { value: "American Express", label: "American Express" },
  { value: "Hipercard", label: "Hipercard" },
  { value: "Discover", label: "Discover" },
];

// Paleta de cores predefinidas para cartões
const PRESET_COLORS = [
  "#1434CB", // Visa azul
  "#EB001B", // Mastercard vermelho
  "#FF6000", // Elo laranja
  "#006FCF", // Amex azul
  "#CC0000", // Hipercard vermelho escuro
  "#6366f1", // índigo
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#22c55e", // verde
  "#14b8a6", // teal
  "#f97316", // laranja
  "#64748b", // cinza
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Cartões de Crédito</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Gerencie seus cartões e limites</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Cartão</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dueDay">Dia Vencimento</Label>
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
                  <Label htmlFor="closingDay">Dia Fechamento</Label>
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

              {/* Preview do cartão */}
              <div className="rounded-lg overflow-hidden border border-border">
                <div
                  className="p-3 text-white text-sm font-semibold"
                  style={{ backgroundColor: formData.color }}
                >
                  <div className="flex justify-between items-center">
                    <span>{formData.name || "Nome do Cartão"}</span>
                    <span className="text-white/80 text-xs">{formData.brand}</span>
                  </div>
                  {formData.lastFourDigits && (
                    <p className="text-white/70 text-xs mt-1">****{formData.lastFourDigits}</p>
                  )}
                </div>
                <div className="p-3 bg-card text-xs text-muted-foreground">
                  Preview do cartão
                </div>
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
        <Card className="p-4 md:p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Limite Total</p>
              <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {formatBRL(totalLimit)}
              </p>
            </div>
            <CreditCard className="w-10 h-10 md:w-12 md:h-12 text-purple-300 dark:text-purple-700" />
          </div>
        </Card>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardsQuery.data?.map((card: any) => {
          // Usar a cor salva no banco de dados
          const cardColor = card.color || "#1434CB";
          return (
            <Card
              key={card.id}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/cartoes/${card.id}`)}
            >
              {/* Header com cor personalizada */}
              <div
                className="p-4 text-white"
                style={{ backgroundColor: cardColor }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{card.name}</h3>
                    <p className="text-sm text-white/80">{card.brand}</p>
                    {card.lastFourDigits && (
                      <p className="text-xs text-white/60 mt-0.5">****{card.lastFourDigits}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/70" />
                </div>
              </div>

              {/* Content */}
              <div className="p-4 md:p-6">
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">Limite</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground mt-1">
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
          <p className="text-sm text-muted-foreground mt-1">
            Clique em "Novo Cartão" para adicionar seu primeiro cartão
          </p>
        </Card>
      )}
    </div>
  );
}
