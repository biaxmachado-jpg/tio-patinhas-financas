import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Edit2, Plus, Zap, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const CATEGORY_TYPES = [
  { value: "income", label: "Receita" },
  { value: "expense", label: "Despesa" },
];

const DEFAULT_COLORS = [
  "#6366f1", "#3b82f6", "#0ea5e9", "#06b6d4", "#10b981",
  "#84cc16", "#eab308", "#f59e0b", "#f97316", "#ef4444",
  "#ec4899", "#a855f7", "#8b5cf6",
];

export default function Categories() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedRules, setExpandedRules] = useState<number | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [selectedCategoryForRule, setSelectedCategoryForRule] = useState<number | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);
  const [ruleFormData, setRuleFormData] = useState({
    keywords: "",
    matchType: "contains" as "contains" | "exact" | "startsWith" | "endsWith",
    caseSensitive: false,
    priority: "10",
  });
  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    color: "#6366f1",
  });

  // Queries
  const categoriesQuery = trpc.categories.list.useQuery();
  const rulesQuery = trpc.rules.list.useQuery();

  // Mutations
  const createCategoryMutation = trpc.categories.create.useMutation();
  const updateCategoryMutation = trpc.categories.update.useMutation();
  const deleteCategoryMutation = trpc.categories.delete.useMutation();
  const createRuleMutation = trpc.rules.create.useMutation();
  const updateRuleMutation = trpc.rules.update.useMutation();
  const deleteRuleMutation = trpc.rules.delete.useMutation();
  const applyRulesMutation = trpc.rules.applyToExistingTransactions.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateCategoryMutation.mutateAsync({
          id: editingId,
          name: formData.name,
          color: formData.color,
        });
        toast.success("Categoria atualizada com sucesso!");
      } else {
        await createCategoryMutation.mutateAsync({
          name: formData.name,
          type: formData.type,
          color: formData.color,
        });
        toast.success("Categoria criada com sucesso!");
      }

      await categoriesQuery.refetch();
      setOpen(false);
      setEditingId(null);
      setFormData({ name: "", type: "expense", color: "#6366f1" });
    } catch (error) {
      toast.error("Erro ao salvar categoria");
    }
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCategoryMutation.mutateAsync({ id });
      await categoriesQuery.refetch();
      toast.success("Categoria deletada com sucesso!");
    } catch (error) {
      toast.error("Erro ao deletar categoria");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setEditingId(null);
      setFormData({ name: "", type: "expense", color: "#6366f1" });
    }
  };

  const handleAddRule = async () => {
    if (!selectedCategoryForRule || !ruleFormData.keywords.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    const keywords = ruleFormData.keywords
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywords.length === 0) {
      toast.error("Adicione pelo menos uma palavra-chave");
      return;
    }

    try {
      await createRuleMutation.mutateAsync({
        categoryId: selectedCategoryForRule,
        keywords,
        matchType: ruleFormData.matchType,
        caseSensitive: ruleFormData.caseSensitive,
        priority: parseInt(ruleFormData.priority),
      });
      toast.success("Regra criada com sucesso!");
      await rulesQuery.refetch();
      setRuleDialogOpen(false);
      setSelectedCategoryForRule(null);
      setRuleFormData({
        keywords: "",
        matchType: "contains",
        caseSensitive: false,
        priority: "10",
      });
    } catch (error) {
      toast.error("Erro ao criar regra");
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    setDeletingRuleId(ruleId);
    try {
      const rule = rulesQuery.data?.find(r => r.id === ruleId);
      const ruleDescription = rule?.keywords?.join(", ") || "Regra";
      
      await deleteRuleMutation.mutateAsync({ id: ruleId });
      await rulesQuery.refetch();
      
      toast.success(`Regra "${ruleDescription}" deletada com sucesso!`, {
        description: "A regra foi removida e não será mais aplicada às transações.",
        duration: 4000,
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Erro desconhecido";
      toast.error("Erro ao deletar regra", {
        description: errorMessage.includes("FOREIGN KEY") 
          ? "Esta regra não pode ser deletada. Verifique se há transações associadas."
          : "Tente novamente ou entre em contato com o suporte.",
        duration: 5000,
      });
    } finally {
      setDeletingRuleId(null);
    }
  };

  const handleApplyRules = async () => {
    if (!confirm("Deseja aplicar as regras de categorização a todas as transações? Isso pode levar alguns segundos.")) {
      return;
    }

    try {
      const result = await applyRulesMutation.mutateAsync();
      toast.success(`${result.stats.updatedCount} transações foram categorizadas!`);
    } catch (error) {
      toast.error("Erro ao aplicar regras");
    }
  };

  const getCategoriesRules = (categoryId: number) => {
    return rulesQuery.data?.filter(r => r.categoryId === categoryId) || [];
  };

  const incomeCategories = categoriesQuery.data?.filter(c => c.type === "income") || [];
  const expenseCategories = categoriesQuery.data?.filter(c => c.type === "expense") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categorias</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas categorias de receitas e despesas</p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleApplyRules}
            disabled={applyRulesMutation.isPending}
            variant="outline"
            className="gap-2"
          >
            {applyRulesMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Aplicar Regras
              </>
            )}
          </Button>

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Categoria</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Alimentação"
                    required
                  />
                </div>

                {!editingId && (
                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as "income" | "expense" })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="color">Cor</Label>
                  <div className="grid grid-cols-7 gap-2 mt-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          formData.color === color ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingId ? "Atualizar" : "Criar"} Categoria
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Income Categories */}
      {incomeCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Receitas</h2>
          <div className="space-y-3">
            {incomeCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                rules={getCategoriesRules(category.id)}
                expandedRules={expandedRules}
                setExpandedRules={setExpandedRules}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddRule={() => {
                  setSelectedCategoryForRule(category.id);
                  setRuleDialogOpen(true);
                }}
                onDeleteRule={handleDeleteRule}
                deletingRuleId={deletingRuleId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Expense Categories */}
      {expenseCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Despesas</h2>
          <div className="space-y-3">
            {expenseCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                rules={getCategoriesRules(category.id)}
                expandedRules={expandedRules}
                setExpandedRules={setExpandedRules}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddRule={() => {
                  setSelectedCategoryForRule(category.id);
                  setRuleDialogOpen(true);
                }}
                onDeleteRule={handleDeleteRule}
                deletingRuleId={deletingRuleId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Regra de Categorização</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
              <Input
                id="keywords"
                value={ruleFormData.keywords}
                onChange={(e) => setRuleFormData({ ...ruleFormData, keywords: e.target.value })}
                placeholder="Ex: Salão, Beleza, Spa"
              />
            </div>

            <div>
              <Label htmlFor="matchType">Tipo de Correspondência</Label>
              <Select
                value={ruleFormData.matchType}
                onValueChange={(value: any) => setRuleFormData({ ...ruleFormData, matchType: value })}
              >
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
            </div>

            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Input
                id="priority"
                type="number"
                value={ruleFormData.priority}
                onChange={(e) => setRuleFormData({ ...ruleFormData, priority: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="caseSensitive"
                checked={ruleFormData.caseSensitive}
                onCheckedChange={(checked) => setRuleFormData({ ...ruleFormData, caseSensitive: checked as boolean })}
              />
              <Label htmlFor="caseSensitive" className="text-sm font-medium cursor-pointer">
                Case-sensitive
              </Label>
            </div>

            <Button onClick={handleAddRule} className="w-full">
              Adicionar Regra
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CategoryCardProps {
  category: any;
  rules: any[];
  expandedRules: number | null;
  setExpandedRules: (id: number | null) => void;
  onEdit: (category: any) => void;
  onDelete: (id: number) => void;
  onAddRule: () => void;
  onDeleteRule: (ruleId: number) => void;
  deletingRuleId: number | null;
}

function CategoryCard({
  category,
  rules,
  expandedRules,
  setExpandedRules,
  onEdit,
  onDelete,
  onAddRule,
  onDeleteRule,
  deletingRuleId,
}: CategoryCardProps) {
  const isExpanded = expandedRules === category.id;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: category.color }}
          />
          <div>
            <h3 className="font-semibold text-foreground">{category.name}</h3>
            <p className="text-xs text-muted-foreground">
              {rules.length} {rules.length === 1 ? "regra" : "regras"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category.id)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedRules(isExpanded ? null : category.id)}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {rules.length > 0 ? (
            rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {rule.keywords.join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rule.matchType === "contains" && "Contém"}
                    {rule.matchType === "exact" && "Exato"}
                    {rule.matchType === "startsWith" && "Começa com"}
                    {rule.matchType === "endsWith" && "Termina com"}
                    {" • Prioridade: " + rule.priority}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteRule(rule.id)}
                  disabled={deletingRuleId === rule.id}
                  className="relative"
                >
                  {deletingRuleId === rule.id ? (
                    <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-500" />
                  )}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada</p>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={onAddRule}
          >
            <Plus className="w-4 h-4" />
            Adicionar Regra
          </Button>
        </div>
      )}
    </Card>
  );
}
