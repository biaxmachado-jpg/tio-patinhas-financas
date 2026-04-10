import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit2, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function CategorizationRules() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    categoryId: 0,
    keywords: "",
    matchType: "contains" as "contains" | "exact" | "startsWith" | "endsWith",
    caseSensitive: false,
    priority: 0,
    enabled: true,
  });

  const { data: rules, refetch } = trpc.categorizationRules.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const createMutation = trpc.categorizationRules.create.useMutation();
  const updateMutation = trpc.categorizationRules.update.useMutation();
  const deleteMutation = trpc.categorizationRules.delete.useMutation();

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Regra atualizada com sucesso!");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Regra criada com sucesso!");
      }
      setOpen(false);
      setEditingId(null);
      setFormData({
        categoryId: 0,
        keywords: "",
        matchType: "contains",
        caseSensitive: false,
        priority: 0,
        enabled: true,
      });
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar regra");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Regra deletada com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao deletar regra");
    }
  };

  const handleToggleEnabled = async (id: number, enabled: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id,
        enabled: !enabled,
      });
      refetch();
    } catch (error) {
      toast.error("Erro ao atualizar regra");
    }
  };

  const handleChangePriority = async (id: number, newPriority: number) => {
    try {
      await updateMutation.mutateAsync({
        id,
        priority: newPriority,
      });
      refetch();
    } catch (error) {
      toast.error("Erro ao atualizar prioridade");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Regras de Categorização</h1>
            <p className="text-muted-foreground">Configure regras automáticas para categorizar transações</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Regra" : "Nova Regra de Categorização"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.categoryId.toString()} onValueChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="keywords">Palavras-chave</Label>
                  <Input
                    id="keywords"
                    placeholder="Ex: supermercado, padaria, mercado (separadas por vírgula)"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Insira as palavras-chave separadas por vírgula
                  </p>
                </div>

                <div>
                  <Label htmlFor="matchType">Tipo de Correspondência</Label>
                  <Select value={formData.matchType} onValueChange={(value) => setFormData({ ...formData, matchType: value as "contains" | "exact" | "startsWith" | "endsWith" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contém</SelectItem>
                      <SelectItem value="exact">Exato</SelectItem>
                      <SelectItem value="startsWith">Começa com</SelectItem>
                      <SelectItem value="endsWith">Termina com</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Define como as palavras-chave serão comparadas com a descrição
                  </p>
                </div>

                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Input
                    id="priority"
                    type="number"
                    placeholder="0"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Regras com prioridade maior são verificadas primeiro
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="caseSensitive"
                    checked={formData.caseSensitive}
                    onCheckedChange={(checked) => setFormData({ ...formData, caseSensitive: checked as boolean })}
                  />
                  <Label htmlFor="caseSensitive" className="cursor-pointer">
                    Diferenciar maiúsculas e minúsculas
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked as boolean })}
                  />
                  <Label htmlFor="enabled" className="cursor-pointer">
                    Ativar esta regra
                  </Label>
                </div>

                <Button type="submit" className="w-full">
                  {editingId ? "Atualizar" : "Criar"} Regra
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Rules List */}
        <div className="space-y-3">
          {rules?.sort((a, b) => b.priority - a.priority).map((rule, index) => {
            const category = categories?.find((c) => c.id === rule.categoryId);
            return (
              <div
                key={rule.id}
                className={`card-elevated p-4 space-y-3 ${!rule.enabled ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => handleToggleEnabled(rule.id, rule.enabled)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          rule.enabled
                            ? "bg-primary border-primary"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {rule.enabled && <span className="text-primary-foreground text-xs">✓</span>}
                      </button>
                      <div>
                        <h3 className="font-semibold text-foreground">{category?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Palavras-chave: {rule.keywords}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Tipo:</span>
                        <p className="font-medium text-foreground">
                          {rule.matchType === "contains"
                            ? "Contém"
                            : rule.matchType === "exact"
                            ? "Exato"
                            : rule.matchType === "startsWith"
                            ? "Começa com"
                            : "Termina com"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prioridade:</span>
                        <p className="font-medium text-foreground">{rule.priority}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Case-sensitive:</span>
                        <p className="font-medium text-foreground">
                          {rule.caseSensitive ? "Sim" : "Não"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <p className="font-medium text-foreground">
                          {rule.enabled ? "Ativa" : "Inativa"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChangePriority(rule.id, rule.priority - 1)}
                        title="Aumentar prioridade"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                    )}
                    {index < (rules?.length || 0) - 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChangePriority(rule.id, rule.priority + 1)}
                        title="Diminuir prioridade"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          categoryId: rule.categoryId,
                          keywords: rule.keywords,
                          matchType: rule.matchType,
                          caseSensitive: rule.caseSensitive,
                          priority: rule.priority,
                          enabled: rule.enabled,
                        });
                        setEditingId(rule.id);
                        setOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {rules?.length === 0 && (
          <div className="text-center py-12 card-elevated">
            <p className="text-muted-foreground mb-4">Nenhuma regra criada ainda</p>
            <Button asChild>
              <a href="#new">Criar primeira regra</a>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
