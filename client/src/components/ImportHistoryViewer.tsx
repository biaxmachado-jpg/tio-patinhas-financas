import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Download, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ImportHistoryViewerProps {
  entityType?: "creditCard" | "bankAccount";
  entityId?: number;
}

export default function ImportHistoryViewer({ entityType, entityId }: ImportHistoryViewerProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: history, isLoading } = trpc.importHistory.list.useQuery({
    entityType: entityType as any,
    entityId,
  });

  const { data: stats } = trpc.importHistory.statistics.useQuery({
    entityType: entityType as any,
  });

  const filteredHistory = history?.filter((item: any) => {
    if (filterStatus === "all") return true;
    return item.status === filterStatus;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "partial":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-600">Sucesso</Badge>;
      case "failed":
        return <Badge variant="destructive">Falha</Badge>;
      case "partial":
        return <Badge variant="secondary">Parcial</Badge>;
      default:
        return <Badge>Desconhecido</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando histórico...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Total de Importações</div>
            <div className="text-2xl font-bold">{stats.totalImports || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Transações Importadas</div>
            <div className="text-2xl font-bold">{stats.totalTransactionsImported || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Duplicatas Encontradas</div>
            <div className="text-2xl font-bold">{stats.totalDuplicatesFound || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</div>
            <div className="text-2xl font-bold">
              {stats.totalImports ? Math.round(((stats.successfulImports || 0) / stats.totalImports) * 100) : 0}%
            </div>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
            <SelectItem value="failed">Falha</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* History List */}
      <div className="space-y-2">
        {filteredHistory.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum histórico de importação encontrado</p>
          </Card>
        ) : (
          filteredHistory.map((item: any) => (
            <Card key={item.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <div>{getStatusIcon(item.status)}</div>
                  <div className="flex-1">
                    <div className="font-medium">{item.fileName}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(item.importedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">{item.transactionsImported} transações</div>
                      <div className="text-sm text-muted-foreground">{item.duplicatesFound} duplicatas</div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${expandedId === item.id ? "rotate-180" : ""}`}
                />
              </button>

              {/* Expanded Details */}
              {expandedId === item.id && (
                <div className="border-t bg-muted/30 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Arquivo:</span>
                      <p className="text-muted-foreground">{item.fileName}</p>
                    </div>
                    <div>
                      <span className="font-medium">Tipo:</span>
                      <p className="text-muted-foreground">{item.fileType}</p>
                    </div>
                    <div>
                      <span className="font-medium">Banco Detectado:</span>
                      <p className="text-muted-foreground">{item.bankDetected || "Não detectado"}</p>
                    </div>
                    <div>
                      <span className="font-medium">Data da Importação:</span>
                      <p className="text-muted-foreground">
                        {format(new Date(item.importedAt), "dd/MM/yyyy HH:mm:ss")}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Transações Importadas:</span>
                      <p className="text-muted-foreground">{item.transactionsImported}</p>
                    </div>
                    <div>
                      <span className="font-medium">Duplicatas Encontradas:</span>
                      <p className="text-muted-foreground">{item.duplicatesFound}</p>
                    </div>
                    <div>
                      <span className="font-medium">Duplicatas Puladas:</span>
                      <p className="text-muted-foreground">{item.duplicatesSkipped || 0}</p>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <p className="text-muted-foreground capitalize">{item.status}</p>
                    </div>
                  </div>

                  {item.errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm font-medium text-red-900">Erro:</p>
                      <p className="text-sm text-red-700">{item.errorMessage}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Detalhes
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
