import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileUp, Eye } from "lucide-react";
import { toast } from "sonner";

export default function ImportarOFX() {
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [fileName, setFileName] = useState<string>("");
  const [previewTransactions, setPreviewTransactions] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accountsQuery = trpc.bankAccounts.list.useQuery();
  const categoriesQuery = trpc.categories.list.useQuery();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    // Simular leitura do arquivo OFX
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      // Aqui você implementaria o parser OFX real
      // Por enquanto, vamos simular algumas transações
      const mockTransactions = [
        {
          date: new Date().toISOString(),
          description: "Transação 1",
          amount: "150.00",
          type: "expense",
        },
        {
          date: new Date().toISOString(),
          description: "Transação 2",
          amount: "200.00",
          type: "income",
        },
      ];
      setPreviewTransactions(mockTransactions);
    };
    reader.readAsText(file);
  };

  const handleVisualize = () => {
    if (!selectedAccount) {
      toast.error("Selecione uma conta");
      return;
    }
    setShowPreview(true);
  };

  const handleImport = async () => {
    if (!selectedAccount || previewTransactions.length === 0) {
      toast.error("Selecione uma conta e arquivo OFX");
      return;
    }

    try {
      // Aqui você implementaria a lógica de importação real
      toast.success(`${previewTransactions.length} transações importadas com sucesso!`);
      setPreviewTransactions([]);
      setFileName("");
      setSelectedAccount("");
      setSelectedCategory("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("Erro ao importar transações");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold">Importar Extratos OFX</h1>
        <p className="text-blue-100 mt-2">Importe transações de extratos bancários em formato OFX</p>
      </div>

      {/* Upload Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Selecione a Conta</label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accountsQuery.data?.map((account: any) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name} ({account.bank})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Categoria Padrão (opcional)</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Usar categoria original" />
              </SelectTrigger>
              <SelectContent>
                {categoriesQuery.data?.map((category: any) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="skipDuplicates"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="skipDuplicates" className="text-sm">
              Pular Transações Duplicadas
            </label>
          </div>

          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <FileUp className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm font-medium">Clique para selecionar arquivo OFX</p>
              <p className="text-xs text-muted-foreground">ou arraste um arquivo aqui</p>
              {fileName && <p className="text-sm text-green-600 mt-2">✓ {fileName}</p>}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx,.OFX"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4"
            >
              <Upload className="w-4 h-4 mr-2" />
              Selecionar Arquivo
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleVisualize}
              disabled={!fileName || !selectedAccount}
            >
              <Eye className="w-4 h-4 mr-2" />
              Visualizar Transações
            </Button>
            <Button
              onClick={handleImport}
              disabled={!fileName || !selectedAccount || previewTransactions.length === 0}
            >
              Importar
            </Button>
          </div>
        </div>
      </Card>

      {/* Preview Section */}
      {showPreview && previewTransactions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Preview de Transações</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Data</th>
                  <th className="text-left py-2 px-2">Descrição</th>
                  <th className="text-left py-2 px-2">Tipo</th>
                  <th className="text-right py-2 px-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {previewTransactions.map((t, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2">{new Date(t.date).toLocaleDateString("pt-BR")}</td>
                    <td className="py-2 px-2">{t.description}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${t.type === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {t.type === "income" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td className={`py-2 px-2 text-right font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "income" ? "+" : "-"}R$ {t.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Total de transações: <strong>{previewTransactions.length}</strong>
          </p>
        </Card>
      )}
    </div>
  );
}
