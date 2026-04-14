import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, User, LogOut, Save, X, CreditCard, Wallet, Edit2, Trash2, Upload, Palette, ChevronRight } from "lucide-react";
import { formatBRL } from "@/lib/currency";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ColorPicker } from "@/components/ColorPicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BankAccount {
  id: number;
  name: string;
  bank: string;
  accountNumber?: string | null;
  [key: string]: any;
}

interface CreditCardType {
  id: number;
  name: string;
  lastFourDigits: string | null;
  brand?: string;
  dueDay?: number;
  closingDay?: number;
  limit?: string | number;
  [key: string]: any;
}

function EditBankAccountDialog({
  account,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: {
  account: BankAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  onDelete: (id: number) => void;
}) {
  const [formData, setFormData] = useState({
    name: account?.name || "",
    bank: account?.bank || "",
    accountNumber: account?.accountNumber || "",
    color: (account as any)?.color || "#3b82f6",
  });

  const PRESET_COLORS = [
    "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#64748b", "#78716c",
  ];

  const handleSave = useCallback(() => {
    onSave(formData);
    onOpenChange(false);
  }, [formData, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Conta Bancária</DialogTitle>
          <DialogDescription>Atualize os dados da sua conta bancária</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome da Conta</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Minha Conta Corrente"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Banco</label>
            <Input
              value={formData.bank}
              onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
              placeholder="Ex: Bradesco"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Número da Conta</label>
            <Input
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="Ex: 123456-7"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Cor</label>
            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 justify-between">
          <Button
            variant="destructive"
            onClick={() => {
              if (account?.id) onDelete(account.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Deletar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCreditCardDialog({
  card,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: {
  card: CreditCardType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  onDelete: (id: number) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    brand: "Visa",
    lastFourDigits: "",
    limit: "0.00",
    dueDay: "10",
    closingDay: "1",
    color: "#1434CB",
  });

  // Sincronizar formData quando card muda
  useEffect(() => {
    if (card) {
      setFormData({
        name: card?.name || "",
        brand: card?.brand || "Visa",
        lastFourDigits: card?.lastFourDigits || "",
        limit: card?.limit?.toString() || "0.00",
        dueDay: card?.dueDay?.toString() || "10",
        closingDay: card?.closingDay?.toString() || "1",
        color: (card as any)?.color || "#1434CB",
      });
    }
  }, [card?.id, open]);

  const CARD_BRANDS = [
    { value: "Visa", label: "Visa" },
    { value: "Mastercard", label: "Mastercard" },
    { value: "Elo", label: "Elo" },
    { value: "American Express", label: "American Express" },
    { value: "Hipercard", label: "Hipercard" },
    { value: "Discover", label: "Discover" },
  ];

  const handleSave = useCallback(() => {
    onSave(formData);
    onOpenChange(false);
  }, [formData, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cartão de Crédito</DialogTitle>
          <DialogDescription>Atualize os dados do seu cartão de crédito</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome do Cartão</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Cartão Master"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Bandeira</label>
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
            <label className="text-sm font-medium">4 Últimos Dígitos</label>
            <Input
              value={formData.lastFourDigits}
              onChange={(e) => setFormData({ ...formData, lastFourDigits: e.target.value.slice(0, 4) })}
              placeholder="Ex: 8631"
              maxLength={4}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Limite (R$)</label>
            <Input
              type="number"
              step="0.01"
              value={formData.limit}
              onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Dia Vencimento</label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.dueDay}
                onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                placeholder="10"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dia Fechamento</label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.closingDay}
                onChange={(e) => setFormData({ ...formData, closingDay: e.target.value })}
                placeholder="1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Cor</label>
            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 justify-between">
          <Button
            variant="destructive"
            onClick={() => {
              if (card?.id) onDelete(card.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Deletar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function MinhasContas() {
  const { data: bankAccounts, isLoading: bankLoading, refetch: refetchBankAccounts } = trpc.bankAccounts.list.useQuery();
  const { data: creditCards, isLoading: cardsLoading, refetch: refetchCreditCards } = trpc.creditCards.list.useQuery();
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);
  const [editingCreditCard, setEditingCreditCard] = useState<CreditCardType | null>(null);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [deletingBankAccountId, setDeletingBankAccountId] = useState<number | null>(null);
  const [deletingCreditCardId, setDeletingCreditCardId] = useState<number | null>(null);
  const deleteBankAccountMutation = trpc.bankAccounts.delete.useMutation();
  const deleteCreditCardMutation = trpc.creditCards.delete.useMutation();
  const [, navigate] = useLocation();

  const handleEditBankAccount = (account: BankAccount) => {
    setEditingBankAccount(account);
    setBankDialogOpen(true);
  };

  const handleEditCreditCard = (card: CreditCardType) => {
    setEditingCreditCard(card);
    setCardDialogOpen(true);
  };

  const updateBankAccountMutation = trpc.bankAccounts.update.useMutation();

  const handleSaveBankAccount = async (data: any) => {
    try {
      if (editingBankAccount?.id) {
        await updateBankAccountMutation.mutateAsync({
          id: editingBankAccount.id,
          name: data.name,
          bank: data.bank,
          accountNumber: data.accountNumber,
          color: data.color,
        });
        refetchBankAccounts();
      }
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
    }
  };

  const updateCreditCardMutation = trpc.creditCards.update.useMutation();

  const handleSaveCreditCard = async (data: any) => {
    try {
      if (editingCreditCard?.id) {
        await updateCreditCardMutation.mutateAsync({
          id: editingCreditCard.id,
          name: data.name,
          brand: data.brand,
          lastFourDigits: data.lastFourDigits,
          limit: data.limit,
          dueDay: parseInt(data.dueDay),
          closingDay: parseInt(data.closingDay),
          color: data.color,
        });
        refetchCreditCards();
      }
    } catch (error) {
      console.error("Erro ao salvar cartão:", error);
    }
  };

  const handleDeleteBankAccount = async (id: number) => {
    try {
      await deleteBankAccountMutation.mutateAsync({ id });
      console.log("Conta bancária excluída com sucesso");
      refetchBankAccounts();
      setDeletingBankAccountId(null);
    } catch (error) {
      console.error("Falha ao excluir conta bancária:", error);
    }
  };

  const handleDeleteCreditCard = async (id: number) => {
    try {
      await deleteCreditCardMutation.mutateAsync({ id });
      console.log("Cartão de crédito excluído com sucesso");
      refetchCreditCards();
      setDeletingCreditCardId(null);
    } catch (error) {
      console.error("Falha ao excluir cartão de crédito:", error);
    }
  };

  if (bankLoading || cardsLoading) {
    return <p className="text-gray-500">Carregando contas...</p>;
  }

  return (
    <div className="space-y-8">
      {/* Contas Bancárias */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Contas Bancárias
        </h3>
        {bankAccounts && bankAccounts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((account: BankAccount) => {
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
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-base">{account.name}</h3>
                        <p className="text-sm text-white/80">{account.bank}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20 h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditBankAccount(account);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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
                        {formatBRL(parseFloat((account as any).balance || "0"))}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">Nenhuma conta bancária cadastrada</p>
        )}
      </div>

      {/* Cartões de Crédito */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Cartões de Crédito
        </h3>
        {creditCards && creditCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creditCards.map((card: CreditCardType) => {
              const cardColor = (card as any).color || "#1434CB";
              return (
                <div
                  key={card.id}
                  className="rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/cartoes/${card.id}`)}
                >
                  {/* Header colorido */}
                  <div
                    className="p-4 text-white"
                    style={{ backgroundColor: cardColor }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-base">{card.name}</h3>
                        <p className="text-sm text-white/80">{card.brand || 'Cartão'}</p>
                        {card.lastFourDigits && (
                          <p className="text-xs text-white/60 mt-0.5">****{card.lastFourDigits}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20 h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCreditCard(card);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-4 bg-card">
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground">Limite</p>
                      <p className="text-lg md:text-xl font-bold text-foreground mt-0.5">
                        {formatBRL(parseFloat((card as any).limit || "0"))}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Vencimento</p>
                        <p className="font-semibold">{card.dueDay || '-'}º</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fechamento</p>
                        <p className="font-semibold">{card.closingDay || '-'}º</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">Nenhum cartão de crédito cadastrado</p>
        )}
      </div>

      {/* Dialogs de Edição */}
      <EditBankAccountDialog
        account={editingBankAccount}
        open={bankDialogOpen}
        onOpenChange={setBankDialogOpen}
        onSave={handleSaveBankAccount}
        onDelete={async (id) => {
          try {
            await deleteBankAccountMutation.mutateAsync({ id });
            setBankDialogOpen(false);
            refetchBankAccounts();
          } catch (error) {
            console.error("Erro ao deletar:", error);
          }
        }}
      />
      <EditCreditCardDialog
        card={editingCreditCard}
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        onSave={handleSaveCreditCard}
        onDelete={async (id) => {
          try {
            await deleteCreditCardMutation.mutateAsync({ id });
            setCardDialogOpen(false);
            refetchCreditCards();
          } catch (error) {
            console.error("Erro ao deletar:", error);
          }
        }}
      />

      {/* Alert Dialog para Exclusão de Conta Bancária */}
      <AlertDialog open={deletingBankAccountId !== null} onOpenChange={(open) => !open && setDeletingBankAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta Bancária</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta bancária? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingBankAccountId && handleDeleteBankAccount(deletingBankAccountId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog para Exclusão de Cartão de Crédito */}
      <AlertDialog open={deletingCreditCardId !== null} onOpenChange={(open) => !open && setDeletingCreditCardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cartão de Crédito</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cartão de crédito? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCreditCardId && handleDeleteCreditCard(deletingCreditCardId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
      });
    }
  }, [user?.id]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      refresh();
    },
  });

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setProfilePhoto(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        ...(profilePhoto && { profilePhoto }),
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
    });
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-gray-500 mt-2">Informações da sua conta</p>
        </div>
        {!isEditing && (
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Editar Perfil
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
          <CardDescription>Detalhes da sua conta de usuário</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Foto de Perfil (clicável) */}
          <div className="flex items-center space-x-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative group"
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="Perfil" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
              <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
                <Upload className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <div>
              <p className="text-sm text-gray-500">ID do Usuário</p>
              <p className="text-lg font-semibold text-foreground">{user.id}</p>
            </div>
          </div>

          {/* Nome (editável) */}
          <div className="flex items-center space-x-4">
            <User className="w-6 h-6 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Nome</p>
              {isEditing ? (
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{formData.name}</p>
              )}
            </div>
          </div>

          {/* Email (editável) */}
          <div className="flex items-center space-x-4">
            <Mail className="w-6 h-6 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Email</p>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{formData.email}</p>
              )}
            </div>
          </div>

          {/* Função */}
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">Função</p>
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {user.role === "admin" ? "Administrador" : "Usuário"}
            </div>
          </div>

          {/* Botões de ação */}
          {isEditing && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Alterações
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minhas Contas */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Contas</CardTitle>
          <CardDescription>Contas bancárias e cartões de crédito</CardDescription>
        </CardHeader>
        <CardContent>
          <MinhasContas />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>Gerenciar sua sessão</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={logout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
