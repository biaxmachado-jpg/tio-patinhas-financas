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
