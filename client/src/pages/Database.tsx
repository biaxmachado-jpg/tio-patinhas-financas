import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database as DatabaseIcon, Eye, Plus, Trash2, Download, Code, Zap, Copy, X } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Database() {
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);

  // Informações de conexão do banco de dados
  const connectionInfo = {
    url: "mysql://Ynap1EtqJHwZpSo.311ba2db6a5a:password@gateway03.us-east-1.prod.aws.tidbcloud.com:4000/tio_patinhas",
    host: "gateway03.us-east-1.prod.aws.tidbcloud.com",
    port: "4000",
    username: "Ynap1EtqJHwZpSo.311ba2db6a5a",
    password: "••••••••",
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência`);
  };

  const databaseFeatures = [
    {
      icon: Eye,
      title: "Visualizar todas as tabelas do banco de dados",
      description: "Veja todas as tabelas e estruturas do sistema",
    },
    {
      icon: Plus,
      title: "Adicionar, editar e deletar registros conforme necessário",
      description: "Gerencie os dados de forma completa",
    },
    {
      icon: Download,
      title: "Fazer backup dos dados através do painel de gerenciamento",
      description: "Proteja seus dados com backups regulares",
    },
    {
      icon: Code,
      title: "Executar queries SQL personalizadas se necessário",
      description: "Execute comandos SQL avançados",
    },
    {
      icon: Zap,
      title: "Gerenciar índices e relacionamentos entre tabelas",
      description: "Otimize o desempenho do banco de dados",
    },
  ];

  const handleOpenDatabase = () => {
    setShowConnectionInfo(true);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Banco de Dados</h1>
          <p className="text-muted-foreground">Gerenciamento de dados do sistema</p>
        </div>

        {/* Database Access Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 rounded-lg">
                  <DatabaseIcon />
                </div>
                <div>
                  <CardTitle>Acesso ao Banco de Dados</CardTitle>
                  <CardDescription>
                    Acesse o painel de gerenciamento da Manus para visualizar, editar e gerenciar todos os dados do sistema.
                    Clique no botão "Database" para abrir o painel completo de gerenciamento.
                  </CardDescription>
                </div>
              </div>
              <Button onClick={handleOpenDatabase}>
                <DatabaseIcon />
                Database
                <span className="text-xs ml-1">🔗</span>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Features Section */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">Funcionalidades do Painel Database</h2>
          <div className="space-y-3">
            {databaseFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <Icon />
                  <div>
                    <p className="font-medium text-foreground">{feature.title}</p>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> O painel de gerenciamento de banco de dados oferece uma interface completa para gerenciar todos os dados do sistema. 
            Use com cuidado ao executar operações de deleção ou modificação de dados.
          </p>
        </div>
      </div>

      {/* Connection Info Dialog */}
      <Dialog open={showConnectionInfo} onOpenChange={setShowConnectionInfo}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Gerenciar banco de dados</DialogTitle>
              <button
                onClick={() => setShowConnectionInfo(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-900">
                <strong>⚠️ Segurança:</strong> Mantenha sua URL de conexão e senha em segurança, pois qualquer pessoa com esses dados pode acessar e alterar nosso banco de dados.
              </p>
            </div>

            {/* URL de Conexão */}
            <div>
              <label className="block text-sm font-medium mb-2">URL de conexão</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={connectionInfo.url}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => handleCopyToClipboard(connectionInfo.url, "URL")}
                  className="p-2 border rounded-md hover:bg-gray-100"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Host do servidor */}
            <div>
              <label className="block text-sm font-medium mb-2">Host do servidor</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={connectionInfo.host}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => handleCopyToClipboard(connectionInfo.host, "Host")}
                  className="p-2 border rounded-md hover:bg-gray-100"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Porta */}
            <div>
              <label className="block text-sm font-medium mb-2">Porta</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={connectionInfo.port}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => handleCopyToClipboard(connectionInfo.port, "Porta")}
                  className="p-2 border rounded-md hover:bg-gray-100"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Nome de usuário */}
            <div>
              <label className="block text-sm font-medium mb-2">Nome de usuário</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={connectionInfo.username}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => handleCopyToClipboard(connectionInfo.username, "Usuário")}
                  className="p-2 border rounded-md hover:bg-gray-100"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium mb-2">Senha</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value="••••••••"
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => handleCopyToClipboard("••••••••", "Senha")}
                  className="p-2 border rounded-md hover:bg-gray-100"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
