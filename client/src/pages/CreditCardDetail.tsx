import { trpc } from "@/lib/trpc";
import { getCardBrandTheme } from "@shared/credit-card-colors";
import { formatBRL, convertBRLToNumber } from "@shared/const";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertCircle, Edit2, Plus, X, Check, RefreshCw, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useParams, useLocation } from "wouter";

export default function CreditCardDetail() {
  const { cardId } = useParams<{ cardId: string }>();
  const [, navigate] = useLocation();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'vista' | 'parcelada'>('all');
  const [editForm, setEditForm] = useState({
    lastFourDigits: "",
    dueDay: "",
    limit: "",
  });
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [editingInstallments, setEditingInstallments] = useState<string>("");
  const [editingField, setEditingField] = useState<'category' | 'value' | 'establishment' | 'installments' | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<number>>(new Set());
  const [isBulkCategoryDialogOpen, setIsBulkCategoryDialogOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: "",
    categoryId: "",
    installments: "1",
  });
  const [isRecategorizing, setIsRecategorizing] = useState(false);

  const cardsQuery = trpc.creditCards.list.useQuery();
  const transactionsQuery = trpc.creditCards.getTransactions.useQuery({
    cardId: parseInt(cardId || "0"),
    month: selectedMonth,
    year: selectedYear,
  });
  const utilizationQuery = trpc.creditCards.getUtilization.useQuery({
    cardId: parseInt(cardId || "0"),
    month: selectedMonth,
    year: selectedYear,
  });
  const categoriesQuery = trpc.categories.list.useQuery();
  const updateCardMutation = trpc.creditCards.update.useMutation();
  const updateTransactionMutation = trpc.creditCards.updateTransaction.useMutation();
  const addTransactionMutation = trpc.creditCards.addTransaction.useMutation();
  const deleteTransactionMutation = trpc.creditCards.deleteTransaction.useMutation();
  const bulkUpdateCategoryMutation = trpc.creditCards.bulkUpdateCategory.useMutation();
  const recategorizeMutation = trpc.creditCards.recategorizeTransactions.useMutation();

  const card = cardsQuery.data?.find((c: any) => c.id === parseInt(cardId || "0"));
  const theme = card ? getCardBrandTheme(card.brand) : null;

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Filter transactions based on selected filter and date range
  const filteredTransactions = transactionsQuery.data?.filter((t: any) => {
    // Filter by installment type
    if (transactionFilter === 'vista' && t.installments !== 1) return false;
    if (transactionFilter === 'parcelada' && t.installments <= 1) return false;
    
    // Filter by date range if custom range is enabled
    if (useCustomDateRange && filterStartDate && filterEndDate) {
      const startDate = new Date(filterStartDate);
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      const transactionDate = new Date(t.date);
      if (transactionDate < startDate || transactionDate > endDate) return false;
    }
    
    return true;
  }) || [];

  // Separate transactions into expenses and refunds
  const expenseTransactions = filteredTransactions.filter((t: any) => parseFloat(t.amount) >= 0);
  const refundTransactions = filteredTransactions.filter((t: any) => parseFloat(t.amount) < 0);

  // Calculate totals based on filtered transactions
  const totalInvoice = filteredTransactions.reduce((sum, t) => {
    const amount = parseFloat(t.amount.toString());
    return sum + amount;
  }, 0);
  const totalInstallments = filteredTransactions.filter((t) => t.installments > 1).reduce((sum, t) => {
    const amount = parseFloat(t.amount.toString());
    return sum + amount;
  }, 0);

  const handleDeleteTransaction = async (transactionId: number) => {
    try {
      await deleteTransactionMutation.mutateAsync({ id: transactionId });
      await transactionsQuery.refetch();
      toast.success("Transação deletada com sucesso!");
    } catch (error) {
      toast.error("Erro ao deletar transação");
    }
  };

  const handleBulkUpdateCategory = async () => {
    if (selectedTransactionIds.size === 0 || !bulkCategoryId) {
      toast.error("Selecione transações e uma categoria");
      return;
    }
    try {
      await bulkUpdateCategoryMutation.mutateAsync({
        transactionIds: Array.from(selectedTransactionIds),
        categoryId: parseInt(bulkCategoryId),
      });
      await transactionsQuery.refetch();
      setSelectedTransactionIds(new Set());
      setBulkCategoryId("");
      setIsBulkCategoryDialogOpen(false);
      toast.success(`${selectedTransactionIds.size} transações atualizadas!`);
    } catch (error) {
      toast.error("Erro ao atualizar categorias");
    }
  };

  const toggleTransactionSelection = (id: number) => {
    const newSelected = new Set(selectedTransactionIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactionIds(newSelected);
  };

  const toggleAllTransactions = () => {
    if (selectedTransactionIds.size === expenseTransactions.length) {
      setSelectedTransactionIds(new Set());
    } else {
      setSelectedTransactionIds(new Set(expenseTransactions.map((t: any) => t.id)));
    }
  };

  const handleOpenEditDialog = () => {
    if (card) {
      setEditForm({
        lastFourDigits: card.lastFourDigits || "",
        dueDay: card.dueDay?.toString() || "",
        limit: card.limit?.toString() || "",
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveChanges = async () => {
    try {
      await updateCardMutation.mutateAsync({
        id: parseInt(cardId || "0"),
        lastFourDigits: editForm.lastFourDigits || undefined,
        dueDay: editForm.dueDay ? parseInt(editForm.dueDay) : undefined,
        limit: editForm.limit ? convertBRLToNumber(editForm.limit) : undefined,
      });
      setIsEditDialogOpen(false);
      cardsQuery.refetch();
    } catch (error) {
      console.error("Erro ao atualizar cartao:", error);
    }
  };

  const handleRecategorize = async () => {
    if (!cardId) return;
    
    setIsRecategorizing(true);
    try {
      const result = await recategorizeMutation.mutateAsync({ cardId: parseInt(cardId) });
      if (result.stats.updatedCount === 0) {
        toast.info(result.message || "Nenhuma transacao foi recategorizada");
      } else {
        toast.success(`${result.stats.updatedCount} transacao(oes) recategorizada(s)`);
      }
      await transactionsQuery.refetch();
    } catch (error: any) {
      console.error("Erro ao recategorizar:", error);
      toast.error(error?.message || "Erro ao recategorizar transacoes");
    } finally {
      setIsRecategorizing(false);
    }
  };

  const handleEditTransactionField = async (transaction: any, field: 'category' | 'value' | 'establishment', value: string) => {
    try {
      const updateData: any = { id: transaction.id };
      
      if (field === 'category') {
        updateData.categoryId = parseInt(value);
      } else if (field === 'value') {
        updateData.amount = convertBRLToNumber(value);
      } else if (field === 'establishment') {
        updateData.description = value;
      }

      await updateTransactionMutation.mutateAsync(updateData);
      setEditingField(null);
      setEditingValue("");
      transactionsQuery.refetch();
    } catch (error) {
      console.error("Erro ao atualizar transação:", error);
    }
  };

  const handleAddTransaction = async () => {
    try {
      if (!newTransaction.description || !newTransaction.amount || !newTransaction.categoryId) {
        alert("Preencha todos os campos obrigatórios");
        return;
      }

      const dueDate = new Date(selectedYear, selectedMonth - 1, card?.dueDay || 1);

      await addTransactionMutation.mutateAsync({
        cardId: parseInt(cardId || "0"),
        categoryId: parseInt(newTransaction.categoryId),
        description: newTransaction.description,
        amount: convertBRLToNumber(newTransaction.amount),
        date: new Date(),
        dueDate,
        installments: parseInt(newTransaction.installments) || 1,
      });

      setNewTransaction({
        description: "",
        amount: "",
        categoryId: "",
        installments: "1",
      });
      setIsAddTransactionOpen(false);
      transactionsQuery.refetch();
    } catch (error) {
      console.error("Erro ao adicionar transação:", error);
    }
  };

  if (!card || !theme) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Cartão não encontrado</p>
        </Card>
      </div>
    );
  }

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleClearDateFilter = () => {
    setUseCustomDateRange(false);
    setFilterStartDate("");
    setFilterEndDate("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl p-8 text-white" style={{
        background: `linear-gradient(to bottom right, ${theme.color}, ${theme.color}dd)`
      }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{card.name}</h1>
            <p className="text-white/80 mt-1">Movimentações do cartão</p>
            <div className="mt-4 space-y-1 text-sm text-white/80">
              {card.lastFourDigits && (
                <p>Número final: {card.lastFourDigits}</p>
              )}
              {card.dueDay && (
                <p>Vencimento: dia {card.dueDay}</p>
              )}
              {card.limit && (
                <p>Limite: {formatBRL(card.limit)}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button 
                className="gap-2 bg-white text-gray-900 hover:bg-gray-100"
                onClick={() => navigate(`/cartoes/${cardId}/importar-ofx`)}
              >
                <Upload className="w-4 h-4" />
                Importar OFX
              </Button>
              <Button 
                className="gap-2 bg-white text-gray-900 hover:bg-gray-100"
                onClick={() => navigate(`/cartoes/${cardId}/importar-pdf`)}
              >
                <Upload className="w-4 h-4" />
                Importar PDF
              </Button>
              <Button 
                className="gap-2 bg-white text-gray-900 hover:bg-gray-100"
                onClick={handleRecategorize}
                disabled={isRecategorizing}
              >
                {isRecategorizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recategorizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Reclassificar
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Incluir Transação Manualmente</DialogTitle>
                    <DialogDescription>
                      Adicione uma transação manualmente ao cartão
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Estabelecimento</label>
                      <Input
                        type="text"
                        placeholder="Ex: Supermercado XYZ"
                        value={newTransaction.description}
                        onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Valor (R$)</label>
                      <Input
                        type="text"
                        placeholder="1.000,00"
                        value={newTransaction.amount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.,]/g, '');
                          setNewTransaction({ ...newTransaction, amount: value });
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Categoria</label>
                      <Select value={newTransaction.categoryId} onValueChange={(value) => setNewTransaction({ ...newTransaction, categoryId: value })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriesQuery.data?.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Parcelas</label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newTransaction.installments}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          const num = parseInt(val) || 0;
                          if (num >= 1 && num <= 36) {
                            setNewTransaction({ ...newTransaction, installments: val });
                          } else if (val === '') {
                            setNewTransaction({ ...newTransaction, installments: '1' });
                          }
                        }}
                        placeholder="1-36"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddTransactionOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAddTransaction}
                        disabled={addTransactionMutation.isPending}
                      >
                        {addTransactionMutation.isPending ? "Adicionando..." : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="gap-2 bg-white text-gray-900 hover:bg-gray-100"
                    onClick={handleOpenEditDialog}
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar Cartão
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Informações do Cartão</DialogTitle>
                    <DialogDescription>
                      Atualize o número final, data de vencimento e limite do cartão
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Número Final (4 dígitos)</label>
                      <Input
                        type="text"
                        maxLength={4}
                        placeholder="0000"
                        value={editForm.lastFourDigits}
                        onChange={(e) => setEditForm({ ...editForm, lastFourDigits: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Dia do Vencimento (1-31)</label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="15"
                        value={editForm.dueDay}
                        onChange={(e) => setEditForm({ ...editForm, dueDay: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Limite (R$)</label>
                      <Input
                        type="text"
                        placeholder="5.000,00"
                        value={editForm.limit}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.,]/g, '');
                          setEditForm({ ...editForm, limit: value });
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveChanges}
                        disabled={updateCardMutation.isPending}
                      >
                        {updateCardMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-white/80 text-sm">
            {format(new Date(selectedYear, selectedMonth - 1), "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={handleNextMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Limite Total</p>
          <p className="text-3xl font-bold text-foreground">
            {formatBRL(card.limit)}
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Valor Total da Fatura</p>
          <p className="text-3xl font-bold text-red-600">
            {formatBRL(totalInvoice)}
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Valor Parcelado</p>
          <p className="text-3xl font-bold text-blue-600">
            {formatBRL(totalInstallments)}
          </p>
        </Card>
      </div>

      {/* Date Range Filter */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomDateRange}
              onChange={(e) => setUseCustomDateRange(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Período Personalizado</span>
          </label>
          {useCustomDateRange && (
            <div className="flex gap-2 items-end">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-muted-foreground mb-1">De</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="px-2 py-1 border border-border rounded text-sm"
                />
              </div>
              <span className="text-muted-foreground">até</span>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-muted-foreground mb-1">Até</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="px-2 py-1 border border-border rounded text-sm"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearDateFilter}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Transações do Mês</h2>
          <div className="flex gap-2">

            {isEditMode && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setIsEditMode(false);
                    setEditingField(null);
                    setEditingTransactionId(null);
                  }}
                >
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditMode(false);
                    setEditingField(null);
                    setEditingTransactionId(null);
                    transactionsQuery.refetch();
                  }}
                >
                  Cancelar
                </Button>
                {selectedTransactionIds.size > 0 && (
                  <Dialog open={isBulkCategoryDialogOpen} onOpenChange={setIsBulkCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default" size="sm" className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Atribuir Categoria ({selectedTransactionIds.size})
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Atribuir Categoria em Massa</DialogTitle>
                        <DialogDescription>
                          Selecione uma categoria para {selectedTransactionIds.size} transacao(oes)
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoriesQuery.data?.map((cat: any) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setIsBulkCategoryDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button variant="default" onClick={handleBulkUpdateCategory}>
                            Aplicar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
            <div className="flex gap-2">
            <Button
              variant={transactionFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTransactionFilter('all')}
            >
              Todas
            </Button>
            <Button
              variant={transactionFilter === 'vista' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTransactionFilter('vista')}
            >
              À Vista
            </Button>
            <Button
              variant={transactionFilter === 'parcelada' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTransactionFilter('parcelada')}
            >
              Parceladas
            </Button>
            </div>
            <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
              <DialogTrigger asChild>
                  <Button 
                    variant="default"
                    size="sm"
                    onClick={() => setIsEditMode(!isEditMode)}
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar Fatura
                  </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {expenseTransactions.length > 0 ? (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {isEditMode && (
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground w-10">
                      <Checkbox
                        checked={selectedTransactionIds.size === expenseTransactions.length && expenseTransactions.length > 0}
                        onCheckedChange={toggleAllTransactions}
                      />
                    </th>
                  )}
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Data</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Estabelecimento</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Parcelado?</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {expenseTransactions.map((transaction: any) => (
                  <tr key={transaction.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    {isEditMode && (
                      <td className="text-center py-3 px-2">
                        <Checkbox
                          checked={selectedTransactionIds.has(transaction.id)}
                          onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                        />
                      </td>
                    )}
                    <td className="py-3 px-2 text-muted-foreground">
                      {format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className={`py-3 px-2 text-foreground ${isEditMode ? 'cursor-pointer hover:underline' : ''}`} onClick={() => {
                      if (!isEditMode) return;
                      setEditingField('establishment');
                      setEditingValue(transaction.description);
                      setEditingTransactionId(transaction.id);
                    }}>
                      {editingField === 'establishment' && editingTransactionId === transaction.id ? (
                        <Input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleEditTransactionField(transaction, 'establishment', editingValue)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditTransactionField(transaction, 'establishment', editingValue);
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        transaction.description
                      )}
                    </td>
                    <td className={`py-3 px-2 text-muted-foreground ${isEditMode ? 'cursor-pointer hover:underline' : ''}`} onClick={() => {
                      if (!isEditMode) return;
                      setEditingField('category');
                      setEditingValue(transaction.categoryId?.toString() || '');
                      setEditingTransactionId(transaction.id);
                    }}>
                      {editingField === 'category' && editingTransactionId === transaction.id ? (
                        <Select value={editingValue} onValueChange={(value) => {
                          handleEditTransactionField(transaction, 'category', value);
                        }}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categoriesQuery.data?.map((cat: any) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        categoriesQuery.data?.find((c: any) => c.id === transaction.categoryId)?.name || '-'
                      )}
                    </td>
                      <td className={`py-3 px-2 text-right font-semibold text-red-600 ${isEditMode ? 'cursor-pointer hover:underline' : ''}`} onClick={() => {
                        if (!isEditMode) return;
                      setEditingField('value');
                      setEditingValue(formatBRL(transaction.amount).replace('R$', ''));
                      setEditingTransactionId(transaction.id);
                    }}>
                      {editingField === 'value' && editingTransactionId === transaction.id ? (
                        <Input
                          type="text"
                          value={editingValue}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.,]/g, '');
                            setEditingValue(value);
                          }}
                          onBlur={() => handleEditTransactionField(transaction, 'value', editingValue)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditTransactionField(transaction, 'value', editingValue);
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          autoFocus
                          className="h-8 text-right"
                        />
                      ) : (
                        formatBRL(transaction.amount)
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Dialog open={editingTransactionId === transaction.id && editingField === 'installments'} onOpenChange={(open) => {
                        if (open) {
                          setEditingTransactionId(transaction.id);
                          setEditingField('installments');
                          setEditingInstallments(transaction.installments.toString());
                        } else {
                          setEditingTransactionId(null);
                          setEditingField(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground cursor-pointer">
                            {transaction.installments > 1 ? "Sim" : "Não"}
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Parcelamento</DialogTitle>
                            <DialogDescription>
                              {transaction.description}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Número de Parcelas</label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={editingInstallments}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '');
                                  const num = parseInt(val) || 0;
                                  if (num >= 1 && num <= 36) {
                                    setEditingInstallments(val);
                                  } else if (val === '') {
                                    setEditingInstallments('');
                                  }
                                }}
                                placeholder="1-36"
                                className="mt-1"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => {
                                setEditingTransactionId(null);
                                setEditingField(null);
                              }}>
                                Cancelar
                              </Button>
                              <Button onClick={async () => {
                                try {
                                  await updateTransactionMutation.mutateAsync({
                                    id: transaction.id,
                                    installments: parseInt(editingInstallments) || 1,
                                  });
                                  setEditingTransactionId(null);
                                  setEditingField(null);
                                  transactionsQuery.refetch();
                                } catch (error) {
                                  console.error("Erro ao atualizar transação:", error);
                                }
                              }}>
                                Salvar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {isEditMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 mb-6">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground">
              {transactionFilter === 'vista' && 'Nenhuma transação à vista neste período'}
              {transactionFilter === 'parcelada' && 'Nenhuma transação parcelada neste período'}
              {transactionFilter === 'all' && 'Nenhuma transação neste período'}
            </p>
          </div>
        )}

        {/* Refunds Section */}
        {refundTransactions.length > 0 && (
          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-600" />
              Reembolsos
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Estabelecimento</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Categoria</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Data</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Valor</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Parcelado?</th>
                  </tr>
                </thead>
                <tbody>
                  {refundTransactions.map((transaction: any) => (
                    <tr key={transaction.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 text-foreground cursor-pointer hover:underline" onClick={() => {
                        setEditingField('establishment');
                        setEditingValue(transaction.description);
                        setEditingTransactionId(transaction.id);
                      }}>
                        {editingField === 'establishment' && editingTransactionId === transaction.id ? (
                          <Input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleEditTransactionField(transaction, 'establishment', editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditTransactionField(transaction, 'establishment', editingValue);
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                            autoFocus
                            className="h-8"
                          />
                        ) : (
                          transaction.description
                        )}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground cursor-pointer hover:underline" onClick={() => {
                        setEditingField('category');
                        setEditingValue(transaction.categoryId?.toString() || '');
                        setEditingTransactionId(transaction.id);
                      }}>
                        {editingField === 'category' && editingTransactionId === transaction.id ? (
                          <Select value={editingValue} onValueChange={(value) => {
                            handleEditTransactionField(transaction, 'category', value);
                          }}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categoriesQuery.data?.map((cat: any) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          categoriesQuery.data?.find((c: any) => c.id === transaction.categoryId)?.name || '-'
                        )}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-green-600 cursor-pointer hover:underline" onClick={() => {
                        setEditingField('value');
                        setEditingValue(formatBRL(Math.abs(parseFloat(transaction.amount))).replace('R$', ''));
                        setEditingTransactionId(transaction.id);
                      }}>
                        {editingField === 'value' && editingTransactionId === transaction.id ? (
                          <Input
                            type="text"
                            value={editingValue}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.,]/g, '');
                              setEditingValue(value);
                            }}
                            onBlur={() => handleEditTransactionField(transaction, 'value', '-' + editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditTransactionField(transaction, 'value', '-' + editingValue);
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                            autoFocus
                            className="h-8 text-right"
                          />
                        ) : (
                          formatBRL(Math.abs(parseFloat(transaction.amount)))
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Dialog open={editingTransactionId === transaction.id && editingField === 'installments'} onOpenChange={(open) => {
                          if (open) {
                            setEditingTransactionId(transaction.id);
                            setEditingField('installments');
                            setEditingInstallments(transaction.installments.toString());
                          } else {
                            setEditingTransactionId(null);
                            setEditingField(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground cursor-pointer">
                              {transaction.installments > 1 ? "Sim" : "Não"}
                            </button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Parcelamento</DialogTitle>
                              <DialogDescription>
                                {transaction.description}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Número de Parcelas</label>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={editingInstallments}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    const num = parseInt(val) || 0;
                                    if (num >= 1 && num <= 36) {
                                      setEditingInstallments(val);
                                    } else if (val === '') {
                                      setEditingInstallments('');
                                    }
                                  }}
                                  placeholder="1-36"
                                  className="mt-1"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => {
                                  setEditingTransactionId(null);
                                  setEditingField(null);
                                }}>
                                  Cancelar
                                </Button>
                                <Button onClick={async () => {
                                  try {
                                    await updateTransactionMutation.mutateAsync({
                                      id: transaction.id,
                                      installments: parseInt(editingInstallments) || 1,
                                    });
                                    setEditingTransactionId(null);
                                    setEditingField(null);
                                    transactionsQuery.refetch();
                                  } catch (error) {
                                    console.error("Erro ao atualizar transação:", error);
                                  }
                                }}>
                                  Salvar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {isEditMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
