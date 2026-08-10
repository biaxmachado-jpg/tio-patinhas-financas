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

  const cardsQuery = trpc.creditCards.list.useQuery();
  const createMutation = trpc.creditCards.create.useMutation();
  const updateMutation = trpc.creditCards.update.useMutation();
  const deleteMutation = trpc.creditCards.delete.useMutation();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  const totalLimit = cardsQuery.data?.reduce((sum: number, card: any) => sum + parseFloat(String(card.limit ?? 0)), 0) || 0;

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
          <CreateCreditCardDialog open={open} onOpenChange={handleOpenChange} onSuccess={() => cardsQuery.refetch()} />
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

function CreateCreditCardDialog({ open, onOpenChange, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: "",
    brand: "Visa",
    lastFourDigits: "",
    limit: "",
    dueDay: "10",
    closingDay: "5",
    color: "#1434CB",
  });
  const [selectedColor, setSelectedColor] = useState("#1434CB");
  const createMutation = trpc.creditCards.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        brand: formData.brand,
        lastFourDigits: formData.lastFourDigits,
        limit: formData.limit, // Enviar como string conforme esperado pelo schema
        dueDay: parseInt(formData.dueDay),
        closingDay: parseInt(formData.closingDay),
        color: selectedColor,
      });
      toast.success("Cartão criado com sucesso!");
      setFormData({
        name: "",
        brand: "Visa",
        lastFourDigits: "",
        limit: "",
        dueDay: "10",
        closingDay: "5",
        color: "#1434CB",
      });
      setSelectedColor("#1434CB");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Erro ao criar cartão");
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Novo Cartão de Crédito</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome do Cartão</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Master Black Itaú"
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
          <Label htmlFor="lastFourDigits">4 Últimos Dígitos</Label>
          <Input
            id="lastFourDigits"
            value={formData.lastFourDigits}
            onChange={(e) => setFormData({ ...formData, lastFourDigits: e.target.value.slice(0, 4) })}
            placeholder="Ex: 8631"
            maxLength={4}
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
            placeholder="Ex: 10000"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dueDay">Dia de Vencimento</Label>
            <Input
              id="dueDay"
              type="number"
              min="1"
              max="31"
              value={formData.dueDay}
              onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="closingDay">Dia de Fechamento</Label>
            <Input
              id="closingDay"
              type="number"
              min="1"
              max="31"
              value={formData.closingDay}
              onChange={(e) => setFormData({ ...formData, closingDay: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label>Cor do Cartão</Label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-8 h-8 rounded border-2 ${
                  selectedColor === color ? "border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Criando..." : "Criar Cartão"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
