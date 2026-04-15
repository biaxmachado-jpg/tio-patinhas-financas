import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, ArrowLeft, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";

type ImportType = "creditCard" | "bankAccount";

export default function ImportFile() {
  const { cardId, accountId } = useParams();
  const [, navigate] = useLocation();
  
  const importType: ImportType = cardId ? "creditCard" : "bankAccount";
  const entityId = cardId ? parseInt(cardId || "0") : parseInt(accountId || "0");
  
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardQuery = trpc.creditCards.get.useQuery(
    { id: entityId },
    { enabled: importType === "creditCard" }
  );
  const accountQuery = trpc.bankAccounts.get.useQuery(
    { id: entityId },
    { enabled: importType === "bankAccount" }
  );

  const importMutation = trpc.files.import.useMutation();

  const entity = importType === "creditCard" ? cardQuery.data : accountQuery.data;
  const isLoadingEntity = importType === "creditCard" ? cardQuery.isLoading : accountQuery.isLoading;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validExtensions = [".pdf", ".ofx", ".txt", ".xlsx", ".xls"];
      const fileExtension = "." + selectedFile.name.split(".").pop()?.toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        toast.error("Por favor, selecione um arquivo PDF, OFX, TXT, XLSX ou XLS");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("O arquivo não pode ser maior que 10MB");
        return;
      }
      setFile(selectedFile);
      setUploadSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Por favor, selecione um arquivo");
      return;
    }

    setIsLoading(true);
    try {
      const reader = new FileReader();
      
      const isExcelFile = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      
      reader.onload = async (event) => {
        try {
          let fileContent: string;
          
          if (isExcelFile) {
            // For Excel files, convert ArrayBuffer to base64
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const uint8Array = new Uint8Array(arrayBuffer);
            let binaryString = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binaryString += String.fromCharCode(uint8Array[i]);
            }
            fileContent = btoa(binaryString);
          } else {
            // For text-based files (PDF, OFX, TXT), result is already a string
            fileContent = event.target?.result as string;
          }

          await importMutation.mutateAsync({
            entityType: importType,
            entityId,
            fileContent,
            fileName: file.name,
            fileType: file.name.split(".").pop()?.toLowerCase() || "unknown",
          });

          toast.success("Arquivo importado com sucesso!");
          setUploadSuccess(true);
          setFile(null);
          
          setTimeout(() => {
            if (importType === "creditCard") {
              navigate(`/cartoes/${cardId}`);
            } else {
              navigate(`/contas/${accountId}`);
            }
          }, 2000);
        } catch (error: any) {
          toast.error(error.message || "Erro ao processar o arquivo");
        } finally {
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        toast.error("Erro ao ler o arquivo");
        setIsLoading(false);
      };

      // Use readAsText for text files, readAsArrayBuffer for binary files
      if (isExcelFile) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    } catch (error) {
      toast.error("Erro ao ler o arquivo");
      setIsLoading(false);
    }
  };

  if (isLoadingEntity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (importType === "creditCard") {
              navigate(`/cartoes/${cardId}`);
            } else {
              navigate(`/contas/${accountId}`);
            }
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Importar Arquivo
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {entity?.name}
          </p>
        </div>
      </div>

      <Card className="p-6 md:p-8">
        {uploadSuccess ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Arquivo importado com sucesso!
              </h2>
              <p className="text-muted-foreground">
                {importType === "creditCard"
                  ? "As transações foram adicionadas ao seu cartão."
                  : "As transações foram adicionadas à sua conta."}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {importType === "creditCard"
                ? "Redirecionando para os detalhes do cartão..."
                : "Redirecionando para os detalhes da conta..."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Selecione o arquivo
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Faça upload de um arquivo PDF, OFX, TXT, XLSX ou XLS. O sistema irá extrair as transações automaticamente.
                </p>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.ofx,.txt,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={isLoading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-semibold text-foreground mb-1">
                    {file ? file.name : "Clique para selecionar ou arraste um arquivo"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, OFX, TXT, XLSX ou XLS (máx. 10MB)
                  </p>
                </label>
              </div>

              {file && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {file.name}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    disabled={isLoading}
                  >
                    Remover
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Dica:</p>
                <p>
                  O sistema irá extrair automaticamente as transações do arquivo. Certifique-se de que o arquivo está no formato correto.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (importType === "creditCard") {
                    navigate(`/cartoes/${cardId}`);
                  } else {
                    navigate(`/contas/${accountId}`);
                  }
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!file || isLoading}
              >
                {isLoading ? "Processando..." : "Importar"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
