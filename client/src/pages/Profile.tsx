import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, User, LogOut } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-gray-500 mt-2">Informações da sua conta</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
          <CardDescription>Detalhes da sua conta de usuário</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ID do Usuário</p>
              <p className="text-lg font-semibold text-foreground">{user.id}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <User className="w-6 h-6 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Nome</p>
              <p className="text-lg font-semibold text-foreground">{user.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Mail className="w-6 h-6 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-lg font-semibold text-foreground">{user.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">Função</p>
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {user.role === "admin" ? "Administrador" : "Usuário"}
            </div>
          </div>
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
