import { trpc } from "@/lib/trpc";
import { formatBRL } from "@/lib/currency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Buscar stats do mês selecionado
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });

  const { data: bankAccounts } = trpc.bankAccounts.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();

  // Buscar transações apenas do mês selecionado
  const { startOfMonth, endOfMonth } = useMemo(() => ({
    startOfMonth: new Date(selectedYear, selectedMonth - 1, 1),
    endOfMonth: new Date(selectedYear, selectedMonth, 0, 23, 59, 59),
  }), [selectedMonth, selectedYear]);

  const { data: transactions } = trpc.transactions.list.useQuery({
    startDate: startOfMonth,
    endDate: endOfMonth,
  });

  // Buscar transações de cartão do mês corrente
  const { data: creditCardTransactions } = trpc.creditCardTransactions.list.useQuery({});
  const { data: creditCards } = trpc.creditCards.list.useQuery();

  // Filtrar transações de cartão do mês selecionado
  const currentMonthCCTransactions = creditCardTransactions?.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === selectedMonth - 1 && d.getFullYear() === selectedYear;
  }) || [];

  // Calcular receitas e despesas do mês selecionado
  const currentMonthIncome = (transactions || [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  const currentMonthExpenseBank = (transactions || [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  // Estornos de cartão (negativos = receita)
  const currentMonthCCRefunds = currentMonthCCTransactions
    .filter((t) => parseFloat(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  // Gastos de cartão (positivos = despesa)
  const currentMonthCCExpenses = currentMonthCCTransactions
    .filter((t) => parseFloat(t.amount) > 0)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalIncome = currentMonthIncome + currentMonthCCRefunds;
  const totalExpenses = currentMonthExpenseBank + currentMonthCCExpenses;

  // Dados para o gráfico de barras Receitas vs Despesas
  const chartData = [
    { name: "Receitas", value: totalIncome, color: "#22c55e" },
    { name: "Despesas", value: totalExpenses, color: "#ef4444" },
  ];

  // Breakdown de despesas por categoria (mês corrente)
  const categoryBreakdown = (() => {
    const grouped: Record<string, { value: number; color: string }> = {};

    // Despesas de conta bancária
    (transactions || [])
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = categories?.find((c) => c.id === t.categoryId);
        const name = cat?.name || "Sem categoria";
        const color = cat?.color || "#ef4444";
        if (!grouped[name]) grouped[name] = { value: 0, color };
        grouped[name].value += Math.abs(parseFloat(t.amount));
      });

    // Gastos de cartão de crédito
    currentMonthCCTransactions
      .filter((t) => parseFloat(t.amount) > 0)
      .forEach((t) => {
        const cat = categories?.find((c) => c.id === t.categoryId);
        const name = cat?.name || "Sem categoria";
        const color = cat?.color || "#ef4444";
        if (!grouped[name]) grouped[name] = { value: 0, color };
        grouped[name].value += parseFloat(t.amount);
      });

    return Object.entries(grouped)
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  })();

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
          <p className="font-semibold mb-1">{label || payload[0]?.name}</p>
          <p className="font-bold" style={{ color: payload[0]?.payload?.color || "#333" }}>
            {formatBRL(payload[0]?.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!user) return null;

  const totalBalance = parseFloat(stats?.totalBalance || "0");
  const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);
  const monthLabel = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <DashboardLayout>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedMonth === 1) {
                setSelectedMonth(12);
                setSelectedYear(selectedYear - 1);
              } else {
                setSelectedMonth(selectedMonth - 1);
              }
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {new Date(selectedYear, month - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedMonth === 12) {
                setSelectedMonth(1);
                setSelectedYear(selectedYear + 1);
              } else {
                setSelectedMonth(selectedMonth + 1);
              }
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground">
            Bem-vindo, {user.name}!
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground italic">
            Dados referentes a {monthLabel}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {/* Saldo Total */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-label text-xs md:text-sm">Saldo Total</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="stat-value text-lg md:text-2xl font-bold">
                    {formatBRL(totalBalance)}
                  </p>
                )}
              </div>
              <Wallet className="w-6 h-6 md:w-8 md:h-8 text-primary/50 flex-shrink-0 ml-2" />
            </div>
          </div>

          {/* Receitas do mês */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-label text-xs md:text-sm">Receitas ({monthLabel})</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="stat-value text-lg md:text-2xl font-bold text-green-600">
                    {formatBRL(totalIncome)}
                  </p>
                )}
              </div>
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-green-600/50 flex-shrink-0 ml-2" />
            </div>
          </div>

          {/* Despesas do mês */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-label text-xs md:text-sm">Despesas ({monthLabel})</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="stat-value text-lg md:text-2xl font-bold text-red-600">
                    {formatBRL(totalExpenses)}
                  </p>
                )}
              </div>
              <TrendingDown className="w-6 h-6 md:w-8 md:h-8 text-red-600/50 flex-shrink-0 ml-2" />
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Receitas vs Despesas */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-4 md:p-6">
            <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">
              Receitas vs Despesas — {monthLabel}
            </h3>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={(v: number) => formatBRL(v)}
                      style={{ fontSize: 10, fill: "#555" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Despesas por Categoria */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-4 md:p-6">
            <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">
              Despesas por Categoria — {monthLabel}
            </h3>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={75}
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value, entry: any) => (
                      <span style={{ color: entry.color, fontSize: 10 }}>
                        {value}: {formatBRL(entry.payload.value)}
                      </span>
                    )}
                    wrapperStyle={{ fontSize: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                Nenhuma despesa registrada neste mês
              </div>
            )}
          </div>
        </div>

        {/* Contas Bancárias */}
        {bankAccounts && bankAccounts.length > 0 && (
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-4 md:p-6 space-y-4">
            <h3 className="text-sm md:text-base font-semibold text-foreground">Contas Bancárias</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors"
                >
                  <p className="text-xs text-muted-foreground font-medium truncate">{account.name}</p>
                  <p className="text-sm md:text-base font-bold text-foreground mt-1">
                    {formatBRL(parseFloat(account.balance || "0"))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{account.bank}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
