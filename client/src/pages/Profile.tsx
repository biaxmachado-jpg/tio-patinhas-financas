import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, User, LogOut, Save, X, CreditCard, Wallet } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface BankAccount {
  id: number;
  name: string;
  bank: string;
}

interface CreditCard {
  id: number;
  name: string;
  lastFourDigits: string | null;
}

function MinhasContas() {
  const { data: bankAccounts, isLoading: bankLoading } = trpc.bankAccounts.list.useQuery();
  const { data: creditCards, isLoading: cardsLoading } = trpc.creditCards.list.useQuery();

  if (bankLoading || cardsLoading) {
    return <p className="text-gray-500">Carregando contas...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Contas Bancárias */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Contas Bancárias
        </h3>
        {bankAccounts && bankAccounts.length > 0 ? (
          <div className="space-y-2">
            {bankAccounts.map((account: BankAccount) => (
              <div key={account.id} className="p-3 border rounded-lg hover:bg-muted transition-colors">
                <p className="font-medium text-foreground">{account.name}</p>
                <p className="text-sm text-gray-500">{account.bank}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Nenhuma conta bancária cadastrada</p>
        )}
      </div>

      {/* Cartões de Crédito */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Cartões de Crédito
        </h3>
        {creditCards && creditCards.length > 0 ? (
          <div className="space-y-2">
            {creditCards.map((card: CreditCard) => (
              <div key={card.id} className="p-3 border rounded-lg hover:bg-muted transition-colors">
                <p className="font-medium text-foreground">{card.name}</p>
                <p className="text-sm text-gray-500">Últimos dígitos: {card.lastFourDigits || 'N/A'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Nenhum cartão de crédito cadastrado</p>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      refresh();
    },
  });

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
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
          {/* ID do Usuário (não editável) */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
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
