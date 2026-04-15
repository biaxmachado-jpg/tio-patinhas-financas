"use client";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Edit2, Plus, Zap, ChevronDown, ChevronUp, Loader2, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { ColorPicker } from "@/components/ColorPicker";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const CATEGORY_TYPES = [
  { value: "income", label: "Receita" },
  { value: "expense", label: "Despesa" },
  { value: "transfer", label: "Transferência entre contas" },
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
    type: "expense" as "income" | "expense" | "transfer",
    color: "#6366f1",
  });

  // Queries
  const categoriesQuery = trpc.categories.list.useQuery();
  const rulesQuery = trpc.categorizationRules.list.useQuery();

  // Mutations
  const createCategoryMutation = trpc.categories.create.useMutation();
  const updateCategoryMutation = trpc.categories.update.useMutation();
  const deleteCategoryMutation = trpc.categories.delete.useMutation();
  const createRuleMutation = trpc.categorizationRules.create.useMutation();
  const updateRuleMutation = trpc.categorizationRules.update.useMutation();
  const deleteRuleMutation = trpc.categorizationRules.delete.useMutation();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setEditingId(null);
      setFormData({ name: "", type: "expense", color: "#6366f1" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateCategoryMutation.mutateAsync({
          id: editingId,
          name: formData.name,
          type: formData.type,
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
    } catch (error: any) {
      const errorMessage = error?.message || "Erro desconhecido";
      toast.error("Erro ao deletar categoria", {
        description: errorMessage.includes("FOREIGN KEY") 
          ? "Esta categoria não pode ser deletada. Verifique se há transações associadas."
          : "Tente novamente ou entre em contato com o suporte.",
        duration: 5000,
      });
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategoryForRule || !ruleFormData.keywords) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      await createRuleMutation.mutateAsync({
        categoryId: selectedCategoryForRule,
        keywords: ruleFormData.keywords,
        matchType: ruleFormData.matchType,
        caseSensitive: ruleFormData.caseSensitive,
        priority: parseInt(ruleFormData.priority),
        enabled: true,
      });

      toast.success("Regra criada com sucesso!");
      setRuleDialogOpen(false);
      setRuleFormData({
        keywords: "",
        matchType: "contains",
        caseSensitive: false,
        priority: "10",
      });
      await rulesQuery.refetch();
    } catch (error) {
      toast.error("Erro ao criar regra");
    }
  };

  const handleApplyRules = async () => {
    toast.info("Funcionalidade de aplicação em lote ainda não implementada");
  };

  const getCategoriesRules = (categoryId: number) => {
    return rulesQuery.data?.filter((r: any) => r.categoryId === categoryId) || [];
  };

  const handleDeleteRule = async (ruleId: number) => {
    setDeletingRuleId(ruleId);
    try {
      const rule = rulesQuery.data?.find((r: any) => r.id === ruleId);
      const ruleDescription = rule?.keywords || "Regra";
      
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

  const incomeCategories = categoriesQuery.data?.filter(c => c.type === "income") || [];
  const expenseCategories = categoriesQuery.data?.filter(c => c.type === "expense") || [];
  const transferCategories = categoriesQuery.data?.filter(c => c.type === "transfer") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categorias</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas categorias de receitas, despesas e transferências</p>
        </div>

        <div className="flex gap-2">

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

                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as "income" | "expense" | "transfer" })}>
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

                <div>
                  <Label htmlFor="color">Cor</Label>
                  <input
                    type="color"
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 rounded cursor-pointer"
                  />
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
          <h2 className="text-lg font-semibold text-foreground mb-2">Receitas</h2>
          <div className="space-y-2">
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
          <h2 className="text-lg font-semibold text-foreground mb-2">Despesas</h2>
          <div className="space-y-2">
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

      {/* Transfer Categories */}
      {transferCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Transferências entre Contas</h2>
          <div className="space-y-2">
            {transferCategories.map((category) => (
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

      {/* Rules Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Regra de Categorização</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div>
              <Label htmlFor="keywords">Palavras-chave</Label>
              <Input
                id="keywords"
                value={ruleFormData.keywords}
                onChange={(e) => setRuleFormData({ ...ruleFormData, keywords: e.target.value })}
                placeholder="Ex: Amazon, Uber"
                required
              />
            </div>

            <div>
              <Label htmlFor="matchType">Tipo de Correspondência</Label>
              <Select value={ruleFormData.matchType} onValueChange={(value) => setRuleFormData({ ...ruleFormData, matchType: value as any })}>
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

            <div className="flex items-center gap-2">
              <Checkbox
                id="caseSensitive"
                checked={ruleFormData.caseSensitive}
                onCheckedChange={(checked) => setRuleFormData({ ...ruleFormData, caseSensitive: checked as boolean })}
              />
              <Label htmlFor="caseSensitive">Diferenciar maiúsculas/minúsculas</Label>
            </div>

            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Input
                id="priority"
                type="number"
                value={ruleFormData.priority}
                onChange={(e) => setRuleFormData({ ...ruleFormData, priority: e.target.value })}
                min="1"
                max="100"
              />
            </div>

            <Button type="submit" className="w-full">
              Criar Regra
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Função para obter o ícone baseado no tipo de categoria
function getIconForType(type: "income" | "expense" | "transfer"): React.ReactNode {
  switch (type) {
    case "income":
      return <TrendingUp className="w-5 h-5 text-green-500" />;
    case "expense":
      return <TrendingDown className="w-5 h-5 text-red-500" />;
    case "transfer":
      return <ArrowRightLeft className="w-5 h-5 text-blue-500" />;
    default:
      return null;
  }
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
}: any) {
  return (
    <Card className="p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-lg"
            style={{ backgroundColor: category.color }}
          />
          <div>
            <div className="flex items-center gap-2">
              {getIconForType(category.type)}
              <p className="font-medium text-foreground">{category.name}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {category.type === "income" ? "Receita" : category.type === "expense" ? "Despesa" : "Transferência"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rules && rules.length > 0 ? (
            <button
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
              onClick={() => setExpandedRules(expandedRules === category.id ? null : category.id)}
            >
              {expandedRules === category.id ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {rules.length} regra{rules.length > 1 ? "s" : ""}
            </button>
          ) : (
            <button
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => onAddRule()}
            >
              + Regra
            </button>
          )}
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
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      {expandedRules === category.id && rules && rules.length > 0 && (
        <div className="mt-2 pt-2 border-t space-y-1">
          {rules.map((rule: any) => (
            <div key={rule.id} className="flex items-center justify-between text-xs p-1 bg-muted rounded">
              <span>{rule.keywords}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteRule(rule.id)}
                disabled={deletingRuleId === rule.id}
              >
                {deletingRuleId === rule.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-destructive" />
                )}
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => onAddRule()}
          >
            + Adicionar Regra
          </Button>
        </div>
      )}
    </Card>
  );
}
