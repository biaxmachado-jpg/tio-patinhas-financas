import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database as DatabaseIcon, Eye, Plus, Download, Code, Zap, ExternalLink } from "lucide-react";

const CLOUD_SQL_CONSOLE_URL =
  "https://console.cloud.google.com/sql/instances/tiopatinhas-mysql/studio?project=tiopatinhas-dd76e";

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
      description: "Use o Cloud SQL Studio, dentro do console, pra rodar SQL direto nas tabelas",
    },
    {
      icon: Download,
      title: "Fazer backup dos dados",
      description: "Configure backups automáticos direto na instância do Cloud SQL",
    },
    {
      icon: Code,
      title: "Executar queries SQL personalizadas se necessário",
      description: "Cloud SQL Studio ou qualquer cliente MySQL (usando as credenciais da instância)",
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
                    O banco de dados roda no Google Cloud SQL. Clique no botão abaixo para abrir o SQL Studio da
                    instância — de lá dá pra ver tabelas, rodar queries, configurar backups e mais.
                  </CardDescription>
                </div>
              </div>
              <Button asChild>
                <a href={CLOUD_SQL_CONSOLE_URL} target="_blank" rel="noopener noreferrer">
                  <DatabaseIcon />
                  Abrir SQL Studio
                  <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Features Section */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">O que dá pra fazer no console do Cloud SQL</h2>
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
            <strong>Nota:</strong> o console do Google Cloud oferece uma interface completa para gerenciar todos os
            dados do sistema. Use com cuidado ao executar operações de deleção ou modificação de dados.
          </p>
        </div>
      </div>
    </div>
  );
}
