import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getBankTheme } from "@shared/bank-colors";
import { formatBRL, convertBRLToNumber } from "@shared/const";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, FileUp, Filter, X, Edit2, Check, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BankAccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const [, navigate] = useLocation();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterMinValue, setFilterMinValue] = useState<string>("");
  const [filterMaxValue, setFilterMaxValue] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'description' | 'amount' | 'category' | 'type' | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<number | null>(null);
  const [editingBalances, setEditingBalances] = useState(false);
  const [initialBalanceValue, setInitialBalanceValue] = useState<string>("");
  const [showNewTransactionDialog, setShowNewTransactionDialog] = useState(false);
  const [newTransactionType, setNewTransactionType] = useState<'income' | 'expense'>('income');
  const [newTransactionData, setNewTransactionData] = useState({
    description: '',
    categoryId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [incomeFilterStartDate, setIncomeFilterStartDate] = useState<string>("");
  const [incomeFilterEndDate, setIncomeFilterEndDate] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accountsQuery = trpc.bankAccounts.list.useQuery();
  const categoriesQuery = trpc.categories.list.useQuery();
  const transactionsQuery = trpc.transactions.list.useQuery({
    accountId: parseInt(accountId || "0"),
  });
  const updateAccountMutation = trpc.bankAccounts.update.useMutation({
    onSuccess: () => {
      toast.success("Saldos atualizados com sucesso");
      setEditingBalances(false);
      accountsQuery.refetch();
    },
    onError: () => {
      toast.error("Erro ao atualizar saldos");
    },
  });

  const updateTransactionMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      toast.success("Transação atualizada com sucesso");
      setShowCategoryDialog(false);
      setSelectedTransaction(null);
      setEditingField(null);
      setEditingTransactionId(null);
      transactionsQuery.refetch();
    },
    onError: () => {
      toast.error("Erro ao atualizar transação");
    },
  });
  
  const deleteTransactionMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast.success("Transação deletada com sucesso");
      setDeleteConfirmationId(null);
      transactionsQuery.refetch();
    },
    onError: () => {
      toast.error("Erro ao deletar transação");
    },
  });

  // Reclassify mutation removed - not available in this version

  const account = accountsQuery.data?.find((a: any) => a.id === parseInt(accountId || "0"));
  const theme = account ? getBankTheme(account.bank) : getBankTheme("");

  if (!account) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Conta não encontrada</p>
          <Button onClick={() => navigate("/contas")} className="mt-4">
            Voltar para Contas
          </Button>
        </Card>
      </div>
    );
  }

  const transactions = transactionsQuery.data || [];
  
  // Apply filters
  let filteredTransactions = transactions;
  
  // Filter by selected month/year
  const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
  const monthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
  filteredTransactions = filteredTransactions.filter((t: any) => {
    const transactionDate = new Date(t.date);
    return transactionDate >= monthStart && transactionDate <= monthEnd;
  });
  
  if (filterCategory) {
    filteredTransactions = filteredTransactions.filter((t: any) => t.categoryId === parseInt(filterCategory));
  }
  if (filterType) {
    filteredTransactions = filteredTransactions.filter((t: any) => t.type === filterType);
  }
  if (filterMinValue) {
    const minVal = parseFloat(filterMinValue);
    filteredTransactions = filteredTransactions.filter((t: any) => parseFloat(t.amount.toString()) >= minVal);
  }
  if (filterMaxValue) {
    const maxVal = parseFloat(filterMaxValue);
    filteredTransactions = filteredTransactions.filter((t: any) => parseFloat(t.amount.toString()) <= maxVal);
  }
  if (useCustomDateRange && filterStartDate && filterEndDate) {
    const startDate = new Date(filterStartDate);
    const endDate = new Date(filterEndDate);
    endDate.setHours(23, 59, 59, 999);
    filteredTransactions = filteredTransactions.filter((t: any) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }
  
  const income = filteredTransactions.filter((t) => t.type === "income");
  const expenses = filteredTransactions.filter((t) => t.type === "expense");
  const totalIncome = income.reduce((sum: number, t: any) => sum + parseFloat(t.amount.toString()), 0);
  const totalExpenses = expenses.reduce((sum: number, t: any) => sum + parseFloat(t.amount.toString()), 0);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const handlePreviousMonth = () => {
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

  const monthName = format(new Date(selectedYear, selectedMonth - 1), "MMMM", { locale: ptBR });

  const handleImportClick = () => {
    // Navegar direto para a página de importação de PDF
    navigate(`/contas/${accountId}/importar-pdf`);
  };

  const handleClearFilters = () => {
    setFilterCategory("");
    setFilterType("");
    setFilterMinValue("");
    setFilterMaxValue("");
    setFilterStartDate("");
    setFilterEndDate("");
    setUseCustomDateRange(false);
  };

  const hasActiveFilters = filterCategory || filterType || filterMinValue || filterMaxValue || useCustomDateRange;

  const handleEditTransactionField = async (transaction: any, field: 'description' | 'amount' | 'category' | 'type', value: string) => {
    try {
      const updateData: any = { id: transaction.id };
      
      if (field === 'category') {
        updateData.categoryId = parseInt(value);
      } else if (field === 'amount') {
        updateData.amount = convertBRLToNumber(value);
      } else if (field === 'description') {
        updateData.description = value;
      } else if (field === 'type') {
        updateData.type = value as 'income' | 'expense';
      }

      await updateTransactionMutation.mutateAsync(updateData);
      setEditingField(null);
      setEditingValue("");
      setEditingTransactionId(null);
    } catch (error) {
      console.error("Erro ao atualizar transação:", error);
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    try {
      await deleteTransactionMutation.mutateAsync({ id: transactionId });
    } catch (error) {
      console.error("Erro ao deletar transação:", error);
    }
  };



  return (
    <div className="space-y-6">
      {/* Bank Header */}
      <div className="rounded-lg p-6 text-white" style={{
        background: `linear-gradient(to right, ${theme.primaryColorHex}, ${theme.primaryColorHex}dd)`
      }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">{account.bank}</h1>
            <p className="text-white/80 mt-1">Movimentações da conta</p>
          </div>
          <div className="flex gap-2">
            <Button 
              className="gap-2 bg-white text-gray-900 hover:bg-gray-100"
              onClick={handleImportClick}
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <Button
              className="gap-2 bg-white text-gray-900 hover:bg-gray-100"
              onClick={() => navigate(`/contas/${accountId}/reconciliacao`)}
            >
              Reconciliar
            </Button>

            <Button
              className="gap-2 bg-white text-gray-900 hover:bg-gray-100"
              onClick={() => setShowNewTransactionDialog(true)}
            >
              <Plus className="w-4 h-4" />
              Nova Transação
            </Button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousMonth}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-4">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-32 bg-white/20 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {format(new Date(selectedYear, m - 1), "MMMM", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-24 bg-white/20 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="text-white hover:bg-white/20"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Saldo Inicial e Final */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Saldos</h2>
          {!editingBalances && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingBalances(true);
                setInitialBalanceValue(formatBRL(account.initialBalance || "0").replace('R$', '').trim());
              }}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>

        {editingBalances ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Saldo Inicial</label>
                <Input
                  type="text"
                  value={initialBalanceValue}
                  onChange={(e) => setInitialBalanceValue(e.target.value)}
                  placeholder="0,00"
                  className="text-lg font-semibold"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Saldo Final (Calculado)</label>
                <div className="text-lg font-semibold p-2 bg-muted rounded border border-input">
                  {formatBRL((convertBRLToNumber(initialBalanceValue) + totalIncome - totalExpenses).toString())}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const numericValue = convertBRLToNumber(initialBalanceValue).toString();
                  updateAccountMutation.mutateAsync({
                    id: parseInt(accountId || "0"),
                    balance: numericValue,
                  });
                  setEditingBalances(false);
                }}
              >
                <Check className="w-4 h-4 mr-2" />
                Salvar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingBalances(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-sm font-medium text-foreground mb-1">Saldo Inicial</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatBRL(account.initialBalance || "0")}</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-sm font-medium text-foreground mb-1">Saldo Final</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatBRL(account.finalBalance || "0")}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Mode Controls */}
      {isEditMode && (
        <div className="flex gap-2 justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setIsEditMode(false);
              setEditingField(null);
              setEditingTransactionId(null);
            }}
          >
            <Check className="w-4 h-4 mr-2" />
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
        </div>
      )}

      {/* Advanced Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros Avançados
              {hasActiveFilters && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">Ativo</span>}
            </Button>
            {!isEditMode && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
              Limpar filtros
            </Button>
          )}
        </div>

        {showFilters && (
          <Card className="p-4 bg-muted/50">
            <div className="space-y-4">
              {/* Date Range Filter */}
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
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4" />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categoriesQuery.data?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="income">Entrada</SelectItem>
                    <SelectItem value="expense">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Min Value Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor Mínimo</label>
                <input
                  type="number"
                  placeholder="R$ 0,00"
                  value={filterMinValue}
                  onChange={(e) => setFilterMinValue(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                />
              </div>

              {/* Max Value Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor Máximo</label>
                <input
                  type="number"
                  placeholder="R$ 99.999,99"
                  value={filterMaxValue}
                  onChange={(e) => setFilterMaxValue(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                />
              </div>
            </div>
            </div>
          </Card>
        )}
      </div>

      {/* Transactions Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold">Entradas do Mês</h2>
          </div>
          
          {/* Date Filter for Income */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Data Inicial</label>
              <Input
                type="date"
                value={incomeFilterStartDate}
                onChange={(e) => setIncomeFilterStartDate(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Data Final</label>
              <Input
                type="date"
                value={incomeFilterEndDate}
                onChange={(e) => setIncomeFilterEndDate(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIncomeFilterStartDate("");
                  setIncomeFilterEndDate("");
                }}
                className="h-8"
              >
                Limpar
              </Button>
            </div>
          </div>

          {income.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Data</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Fonte</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Categoria</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {income.map((t: any) => {
                    const category = categoriesQuery.data?.find((c: any) => c.id === t.categoryId);
                    return (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-2 text-muted-foreground">
                          {format(new Date(t.date), "dd/MM", { locale: ptBR })}
                        </td>
                        <td className={`py-3 px-2 text-foreground ${isEditMode ? 'cursor-pointer hover:underline' : ''}`} onClick={() => {
                          if (!isEditMode) return;
                          setEditingField('description');
                          setEditingValue(t.description);
                          setEditingTransactionId(t.id);
                        }}>
                          {editingField === 'description' && editingTransactionId === t.id ? (
                            <Input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleEditTransactionField(t, 'description', editingValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditTransactionField(t, 'description', editingValue);
                                if (e.key === 'Escape') setEditingField(null);
                              }}
                              autoFocus
                              className="h-8"
                            />
                          ) : (
                            t.description
                          )}
                        </td>
                        <td className={`py-3 px-2 text-muted-foreground ${isEditMode ? 'cursor-pointer hover:underline' : ''}`} onClick={() => {
                          if (!isEditMode) return;
                          setEditingField('category');
                          setEditingValue(t.categoryId?.toString() || '');
                          setEditingTransactionId(t.id);
                        }}>
                          {editingField === 'category' && editingTransactionId === t.id ? (
                            <Select value={editingValue} onValueChange={(value) => {
                              handleEditTransactionField(t, 'category', value);
                            }}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categoriesQuery.data?.filter((c: any) => c.type === t.type).map((cat: any) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            category?.name || "-"
                          )}
                        </td>
                        <td className={`py-3 px-2 text-muted-foreground ${isEditMode ? 'cursor-pointer hover:underline' : ''}`} onClick={() => {
                          if (!isEditMode) return;
                          const newType = t.type === 'income' ? 'expense' : 'income';
                          handleEditTransactionField(t, 'type', newType);
                        }}>
                          <span className={t.type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {t.type === 'income' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className={`py-3 px-2 text-right font-semibold text-green-600 ${isEditMode ? 'cursor-pointer hover:underline' : ''}`} onClick={() => {
                          if (!isEditMode) return;
                          setEditingField('amount');
                          setEditingValue(formatBRL(t.amount).replace('R$', ''));
                          setEditingTransactionId(t.id);
                        }}>
                          {editingField === 'amount' && editingTransactionId === t.id ? (
                            <Input
                              type="text"
                              value={editingValue}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.,]/g, '');
                                setEditingValue(value);
                              }}
                              onBlur={() => handleEditTransactionField(t, 'amount', editingValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditTransactionField(t, 'amount', editingValue);
                                if (e.key === 'Escape') setEditingField(null);
                              }}
                              autoFocus
                              className="h-8 text-right"
                            />
                          ) : (
                            `+${formatBRL(t.amount)}`
                          )}
                        </td>
                        {isEditMode && (
                          <td className="py-3 px-2 text-center">
                            <AlertDialog open={deleteConfirmationId === t.id} onOpenChange={(open) => {
                              if (!open) setDeleteConfirmationId(null);
                            }}>
                              <button onClick={() => setDeleteConfirmationId(t.id)} className="text-red-500 hover:text-red-700">
                                <X className="w-4 h-4" />
                              </button>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deletar Transação?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja deletar esta transação? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex gap-2 justify-end">
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTransaction(t.id)} className="bg-red-600 hover:bg-red-700">
                                    Deletar
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Nenhuma entrada registrada</p>
          )}
          {income.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border flex justify-end">
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total de Entradas</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatBRL(income.reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0).toString())}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Expenses */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold">Saídas do Mês</h2>
          </div>

          {expenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Data</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Pagamento</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Categoria</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((t: any) => {
                    const category = categoriesQuery.data?.find((c: any) => c.id === t.categoryId);
                    return (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-2 text-muted-foreground">
                          {format(new Date(t.date), "dd/MM", { locale: ptBR })}
                        </td>
                        <td className={`py-3 px-2 text-foreground ${isEditMode ? 'cursor-pointer hover:underline' : ''}`} onClick={() => {
                          if (!isEditMode) return;
                          setEditingField('description');
                          setEditingValue(t.description);
                          setEditingTransactionId(t.id);
                        }}>
                          {editingField === 'description' && editingTransactionId === t.id ? (
                            <Input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleEditTransactionField(t, 'description', editingValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditTransactionField(t, 'description', editingValue);
                                if (e.key === 'Escape') setEditingField(null);
                              }}
                              autoFocus
                              className="h-8"
                            />
                          ) : (
                            t.description
                          )}
                        </td>
                        <td className={`py-3 px-2 text-muted-foreground ${isEditMode ? 'cursor-pointer hover:underline' : ''}`} onClick={() => {
                          if (!isEditMode) return;
                          setEditingField('category');
                          setEditingValue(t.categoryId?.toString() || '');
                          setEditingTransactionId(t.id);
                        }}>
                          {editingField === 'category' && editingTransactionId === t.id ? (
                            <Select value={editingValue} onValueChange={(value) => {
                              handleEditTransactionField(t, 'category', value);
                            }}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categoriesQuery.data?.filter((c: any) => c.type === t.type).map((cat: any) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            category?.name || "-"
                          )}
                        </td>
                        <td className={`py-3 px-2 text-muted-foreground ${isEditMode ? 'cursor-pointer hover:underline' : ''}`} onClick={() => {
                          if (!isEditMode) return;
                          const newType = t.type === 'income' ? 'expense' : 'income';
                          handleEditTransactionField(t, 'type', newType);
                        }}>
                          <span className={t.type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {t.type === 'income' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className={`py-3 px-2 text-right font-semibold text-red-600 ${isEditMode ? 'cursor-pointer hover:underline' : ''}`} onClick={() => {
                          if (!isEditMode) return;
                          setEditingField('amount');
                          setEditingValue(formatBRL(t.amount).replace('R$', ''));
                          setEditingTransactionId(t.id);
                        }}>
                          {editingField === 'amount' && editingTransactionId === t.id ? (
                            <Input
                              type="text"
                              value={editingValue}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.,]/g, '');
                                setEditingValue(value);
                              }}
                              onBlur={() => handleEditTransactionField(t, 'amount', editingValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditTransactionField(t, 'amount', editingValue);
                                if (e.key === 'Escape') setEditingField(null);
                              }}
                              autoFocus
                              className="h-8 text-right"
                            />
                          ) : (
                            `-${formatBRL(t.amount)}`
                          )}
                        </td>
                        {isEditMode && (
                          <td className="py-3 px-2 text-center">
                            <AlertDialog open={deleteConfirmationId === t.id} onOpenChange={(open) => {
                              if (!open) setDeleteConfirmationId(null);
                            }}>
                              <button onClick={() => setDeleteConfirmationId(t.id)} className="text-red-500 hover:text-red-700">
                                <X className="w-4 h-4" />
                              </button>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deletar Transação?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja deletar esta transação? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex gap-2 justify-end">
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTransaction(t.id)} className="bg-red-600 hover:bg-red-700">
                                    Deletar
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Nenhuma saída registrada</p>
          )}
          {expenses.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border flex justify-end">
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total de Despesas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatBRL(expenses.reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0).toString())}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Category Edit Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Transação</p>
                <p className="text-foreground">{selectedTransaction.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Categoria</label>
                <Select 
                  defaultValue={selectedTransaction.categoryId?.toString() || ""}
                  onValueChange={(categoryId) => {
                    updateTransactionMutation.mutate({
                      id: selectedTransaction.id,
                      categoryId: parseInt(categoryId),
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesQuery.data?.filter((c: any) => c.type === selectedTransaction.type).map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para criar nova transação */}
      <Dialog open={showNewTransactionDialog} onOpenChange={setShowNewTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={newTransactionType} onValueChange={(v) => setNewTransactionType(v as 'income' | 'expense')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Entrada</SelectItem>
                  <SelectItem value="expense">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Categoria</label>
              <Select value={newTransactionData.categoryId} onValueChange={(v) => setNewTransactionData({...newTransactionData, categoryId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesQuery.data?.filter((c: any) => c.type === newTransactionType).map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Descrição</label>
              <Input
                value={newTransactionData.description}
                onChange={(e) => setNewTransactionData({...newTransactionData, description: e.target.value})}
                placeholder="Descrição da transação"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Valor</label>
              <Input
                value={newTransactionData.amount}
                onChange={(e) => setNewTransactionData({...newTransactionData, amount: e.target.value})}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data</label>
              <Input
                type="date"
                value={newTransactionData.date}
                onChange={(e) => setNewTransactionData({...newTransactionData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notas (opcional)</label>
              <Input
                value={newTransactionData.notes}
                onChange={(e) => setNewTransactionData({...newTransactionData, notes: e.target.value})}
                placeholder="Notas adicionais"
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowNewTransactionDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await trpc.transactions.create.useMutation().mutateAsync({
                      accountId: parseInt(accountId || "0"),
                      categoryId: parseInt(newTransactionData.categoryId),
                      type: newTransactionType,
                      description: newTransactionData.description,
                      amount: newTransactionData.amount,
                      date: new Date(newTransactionData.date),
                      notes: newTransactionData.notes,
                    });
                    toast.success("Transação criada com sucesso");
                    setShowNewTransactionDialog(false);
                    setNewTransactionData({
                      description: '',
                      categoryId: '',
                      amount: '',
                      date: format(new Date(), 'yyyy-MM-dd'),
                      notes: '',
                    });
                    transactionsQuery.refetch();
                  } catch (error) {
                    toast.error("Erro ao criar transação");
                  }
                }}
              >
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
