import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, ChevronRight, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface TransactionActionsProps {
  transactionId: number;
  categoryId: number;
  description: string;
  dueDate: Date;
  onDelete?: () => void;
  onUpdate?: () => void;
  onMove?: () => void;
}

export function TransactionActions({
  transactionId,
  categoryId,
  description,
  dueDate,
  onDelete,
  onUpdate,
  onMove,
}: TransactionActionsProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categoryId.toString());

  const { data: categories } = trpc.categories.list.useQuery();
  const updateMutation = trpc.creditCardTransactions.update.useMutation();
  const deleteMutation = trpc.creditCardTransactions.delete.useMutation();
  const moveMutation = trpc.creditCardTransactions.moveToNextBilling.useMutation();

  const handleReclassify = async () => {
    try {
      await updateMutation.mutateAsync({
        id: transactionId,
        categoryId: parseInt(selectedCategory),
      });
      toast.success("Transação reclassificada com sucesso!");
      setShowEditDialog(false);
      onUpdate?.();
    } catch (error) {
      toast.error("Erro ao reclassificar transação");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id: transactionId });
      toast.success("Transação deletada com sucesso!");
      setShowDeleteDialog(false);
      onDelete?.();
    } catch (error) {
      toast.error("Erro ao deletar transação");
    }
  };

  const handleMove = async () => {
    try {
      await moveMutation.mutateAsync({ id: transactionId });
      toast.success("Transação movida para próxima fatura!");
      onMove?.();
    } catch (error) {
      toast.error("Erro ao mover transação");
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {/* Reclassify Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowEditDialog(true)}
          title="Reclassificar"
        >
          <Edit2 className="h-4 w-4" />
        </Button>

        {/* Move to Next Billing Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMove}
          title="Mover para próxima fatura"
          disabled={moveMutation.isPending}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          title="Deletar"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Reclassify Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reclassificar Transação</DialogTitle>
            <DialogDescription>
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleReclassify}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Deletar Transação?
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A transação será removida permanentemente.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted p-3 rounded text-sm">
            <p className="font-medium">{description}</p>
            <p className="text-muted-foreground text-xs mt-1">
              Vencimento: {new Date(dueDate).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
