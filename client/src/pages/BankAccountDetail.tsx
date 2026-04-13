import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getBankTheme } from "@shared/bank-colors";
import { formatBRL, convertBRLToNumber } from "@shared/const";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, FileUp, Filter, X, Edit2, Check, Plus, Wand2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BankAccountDetail() {
  // All useState hooks must come first
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
  const [previousMonthFinalBalance, setPreviousMonthFinalBalance] = useState<number>(0);
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
  const [showApplyRulesConfirmation, setShowApplyRulesConfirmation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // All tRPC queries
  const accountsQuery = trpc.bankAccounts.list.useQuery();
  const categoriesQuery = trpc.categories.list.useQuery();
  const transactionsQuery = trpc.transactions.list.useQuery({
    accountId: parseInt(accountId || "0"),
  });
  
  // All mutations
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

  const applyRulesMutation = trpc.transactions.applyRules.useMutation({
    onSuccess: (count) => {
      toast.success(`${count} transação(ões) categorizada(s) com sucesso`);
      transactionsQuery.refetch();
    },
    onError: () => {
      toast.error("Erro ao aplicar regras de categorização");
    },
  });

  const updateMonthlyBalanceMutation = trpc.bankAccounts.updateMonthlyBalance.useMutation({
    onSuccess: () => {
      toast.success("Saldo inicial atualizado com sucesso");
      setEditingBalances(false);
      transactionsQuery.refetch();
    },
    onError: () => {
      toast.error("Erro ao atualizar saldo inicial");
    },
  });

  // All useEffect hooks must come after all useState and useRef
  // Calculate previous month's final balance
  useEffect(() => {
    if (!transactionsQuery.data) return;
    
    const transactions = transactionsQuery.data || [];
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    
    const prevMonthStart = new Date(prevYear, prevMonth - 1, 1);
    const prevMonthEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59);
    
    const prevMonthTransactions = transactions.filter((t: any) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= prevMonthStart && transactionDate <= prevMonthEnd;
    });
    
    const prevIncome = prevMonthTransactions.filter((t) => t.type === "income");
    const prevExpenses = prevMonthTransactions.filter((t) => t.type === "expense");
    const prevTotalIncome = prevIncome.reduce((sum: number, t: any) => sum + parseFloat(t.amount.toString()), 0);
    const prevTotalExpenses = prevExpenses.reduce((sum: number, t: any) => sum + parseFloat(t.amount.toString()), 0);
    
    // Get the account to calculate previous month's final balance
    const account = accountsQuery.data?.find((a: any) => a.id === parseInt(accountId || "0"));
    if (!account) return;
    
    const prevInitialBalance = parseFloat(account.initialBalance || "0");
    const prevFinalBalance = prevInitialBalance + prevTotalIncome - prevTotalExpenses;
    setPreviousMonthFinalBalance(prevFinalBalance);
  }, [selectedMonth, selectedYear, transactionsQuery.data, accountsQuery.data, accountId]);

  // Computed values
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

  const handleCreateNewTransaction = async () => {
    if (!newTransactionData.description || !newTransactionData.categoryId || !newTransactionData.amount) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const createMutation = trpc.transactions.create.useMutation({
        onSuccess: () => {
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
        },
        onError: () => {
          toast.error("Erro ao criar transação");
        },
      });

      await createMutation.mutateAsync({
        accountId: parseInt(accountId || "0"),
        categoryId: parseInt(newTransactionData.categoryId),
        type: newTransactionType,
        description: newTransactionData.description,
        amount: convertBRLToNumber(newTransactionData.amount).toString(),
        date: new Date(newTransactionData.date),
        notes: newTransactionData.notes,
      });
    } catch (error) {
      console.error("Erro ao criar transação:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-r ${theme.primaryColor} text-white p-6 rounded-lg shadow-xl opacity-100`} style={{backgroundColor: theme.primaryColorHex}}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold drop-shadow-lg" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>{account.name}</h1>
            <p className="text-white/95 drop-shadow" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>Conta: {account.accountNumber || "N/A"}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              className="text-white border-white hover:bg-white/20"
            >
              <FileUp className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white hover:bg-white/20"
            >
              Reconciliar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApplyRulesConfirmation(true)}
              className="text-white border-white hover:bg-white/20"
              disabled={applyRulesMutation.isPending}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {applyRulesMutation.isPending ? "Aplicando..." : "Aplicar Regras"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewTransactionDialog(true)}
              className="text-white border-white hover:bg-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </div>
        </div>

        {/* Month/Year Navigation */}
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
                    {format(new Date(2024, m - 1), "MMMM", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-32 bg-white/20 border-white/30 text-white">
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
                // Use previous month's final balance as default, or account's initial balance if it's the first month
                const defaultInitialBalance = selectedMonth === 1 && selectedYear === new Date().getFullYear() 
                  ? account.initialBalance 
                  : previousMonthFinalBalance.toString();
                const formattedValue = formatBRL(defaultInitialBalance || "0").replace('R$', '').trim();
                setInitialBalanceValue(formattedValue);
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
                  const numericValue = convertBRLToNumber(initialBalanceValue).toFixed(2);
                  updateMonthlyBalanceMutation.mutateAsync({
                    accountId: parseInt(accountId || "0"),
                    month: selectedMonth,
                    year: selectedYear,
                    initialBalance: numericValue,
                  });
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
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {selectedMonth === 1 && selectedYear === new Date().getFullYear()
                  ? formatBRL(account.initialBalance || "0")
                  : formatBRL(previousMonthFinalBalance.toString())}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedMonth === 1 && selectedYear === new Date().getFullYear()
                  ? "Saldo inicial da conta"
                  : "Saldo final do mês anterior"}
              </p>
            </div>
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-sm font-medium text-foreground mb-1">Saldo Final (Calculado)</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatBRL(convertBRLToNumber(account.initialBalance || "0") + totalIncome - totalExpenses)}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Entradas e Saídas */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Entradas do Mês
          </h3>
          <p className="text-3xl font-bold text-green-600 mb-4">{formatBRL(totalIncome.toString())}</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {income.length > 0 ? (
              income.map((t: any) => (
                <div key={t.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm">{t.description}</span>
                  <span className="text-sm font-semibold text-green-600">+{formatBRL(t.amount.toString())}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma entrada</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Saídas do Mês
          </h3>
          <p className="text-3xl font-bold text-red-600 mb-4">{formatBRL(totalExpenses.toString())}</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {expenses.length > 0 ? (
              expenses.map((t: any) => (
                <div key={t.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm">{t.description}</span>
                  <span className="text-sm font-semibold text-red-600">-{formatBRL(t.amount.toString())}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma saída</p>
            )}
          </div>
        </Card>
      </div>

      {/* Transações */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Transações</h2>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {isEditMode ? "Sair do Modo Edição" : "Editar Transações"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros Avançados
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mb-4 p-4 bg-muted rounded space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Categoria</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {categoriesQuery.data?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="income">Entrada</SelectItem>
                    <SelectItem value="expense">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Valor Mínimo"
                value={filterMinValue}
                onChange={(e) => setFilterMinValue(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Valor Máximo"
                value={filterMaxValue}
                onChange={(e) => setFilterMaxValue(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="customRange"
                checked={useCustomDateRange}
                onChange={(e) => setUseCustomDateRange(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="customRange" className="text-sm">Usar período customizado</label>
            </div>
            {useCustomDateRange && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Data</th>
                <th className="text-left py-2 px-2">Descrição</th>
                <th className="text-left py-2 px-2">Categoria</th>
                <th className="text-left py-2 px-2">Tipo</th>
                <th className="text-right py-2 px-2">Valor</th>
                <th className="text-center py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t: any) => {
                  const category = categoriesQuery.data?.find((c: any) => c.id === t.categoryId);
                  return (
                    <tr key={t.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">{format(new Date(t.date), "dd/MM/yyyy")}</td>
                      <td className="py-2 px-2">{t.description}</td>
                      <td className="py-2 px-2">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: category?.color || "#ccc", color: "#fff" }}>
                          {category?.name || "N/A"}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${t.type === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {t.type === "income" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className={`py-2 px-2 text-right font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {t.type === "income" ? "+" : "-"}{formatBRL(t.amount.toString())}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {isEditMode ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(t);
                                setShowCategoryDialog(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmationId(t.id)}
                            >
                              Deletar
                            </Button>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmationId !== null} onOpenChange={(open) => !open && setDeleteConfirmationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Transação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => handleDeleteTransaction(deleteConfirmationId!)}>
            Deletar
          </AlertDialogAction>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Transaction Dialog */}
      <Dialog open={showNewTransactionDialog} onOpenChange={setShowNewTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo</label>
              <Select value={newTransactionType} onValueChange={(v: any) => setNewTransactionType(v)}>
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
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <Input
                value={newTransactionData.description}
                onChange={(e) => setNewTransactionData({ ...newTransactionData, description: e.target.value })}
                placeholder="Descrição da transação"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria</label>
              <Select value={newTransactionData.categoryId} onValueChange={(v) => setNewTransactionData({ ...newTransactionData, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesQuery.data?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Valor</label>
              <Input
                value={newTransactionData.amount}
                onChange={(e) => setNewTransactionData({ ...newTransactionData, amount: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Data</label>
              <Input
                type="date"
                value={newTransactionData.date}
                onChange={(e) => setNewTransactionData({ ...newTransactionData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notas</label>
              <Input
                value={newTransactionData.notes}
                onChange={(e) => setNewTransactionData({ ...newTransactionData, notes: e.target.value })}
                placeholder="Notas adicionais"
              />
            </div>
            <Button onClick={handleCreateNewTransaction} className="w-full">
              Criar Transação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={showCategoryDialog && selectedTransaction !== null} onOpenChange={(open) => !open && setShowCategoryDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Descrição</label>
                <Input
                  value={editingField === 'description' ? editingValue : selectedTransaction.description}
                  onChange={(e) => {
                    setEditingField('description');
                    setEditingValue(e.target.value);
                  }}
                  placeholder="Descrição da transação"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Valor</label>
                <Input
                  value={editingField === 'amount' ? editingValue : formatBRL(selectedTransaction.amount.toString())}
                  onChange={(e) => {
                    setEditingField('amount');
                    setEditingValue(e.target.value);
                  }}
                  placeholder="Valor"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Categoria</label>
                <Select
                  value={editingField === 'category' ? editingValue : selectedTransaction.categoryId.toString()}
                  onValueChange={(value) => {
                    setEditingField('category');
                    setEditingValue(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesQuery.data?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (editingField && editingValue) {
                      handleEditTransactionField(selectedTransaction, editingField, editingValue);
                    }
                  }}
                  className="flex-1"
                >
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCategoryDialog(false);
                    setSelectedTransaction(null);
                    setEditingField(null);
                    setEditingValue("");
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Apply Categorization Rules Confirmation Dialog */}
      <AlertDialog open={showApplyRulesConfirmation} onOpenChange={setShowApplyRulesConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar Regras de Categorização</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja aplicar as regras de categorização automática a todas as transações desta conta? As transações serão categorizadas com base nas palavras-chave das regras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => {
            applyRulesMutation.mutate({ accountId: parseInt(accountId || "0") });
            setShowApplyRulesConfirmation(false);
          }}>
            Aplicar
          </AlertDialogAction>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
