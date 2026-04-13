import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database as DatabaseIcon, Eye, Plus, Trash2, Download, Code, Zap } from "lucide-react";

export default function Database() {
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
              <Button>
                <DatabaseIcon />
                Database
                <span className="text-xs ml-1">↗</span>
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
    </div>
  );
}
