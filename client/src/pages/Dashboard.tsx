import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#06b6d4"];

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const { data: transactions } = trpc.transactions.list.useQuery();
  const { data: bankAccounts } = trpc.bankAccounts.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();

  // Prepare chart data
  const chartData = [
    {
      name: "Receitas",
      value: parseFloat(stats?.totalIncome || "0"),
    },
    {
      name: "Despesas",
      value: parseFloat(stats?.totalExpense || "0"),
    },
  ];

  // Category breakdown
  const categoryBreakdown = categories?.map((cat) => {
    const total = transactions
      ?.filter((t) => t.categoryId === cat.id && t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    return {
      name: cat.name,
      value: total,
      color: cat.color,
    };
  }).filter(cat => cat.value > 0) || [];

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Bem-vindo, {user.name}!</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* Stats Cards - Full Width on Mobile, 3 Columns on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Total Balance */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-label text-xs md:text-sm">Saldo Total</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="stat-value text-lg md:text-2xl font-bold">
                    R$ {parseFloat(stats?.totalBalance || "0").toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
              <Wallet className="w-6 h-6 md:w-8 md:h-8 text-primary/50 flex-shrink-0 ml-2" />
            </div>
          </div>

          {/* Total Income */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-label text-xs md:text-sm">Receitas</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="stat-value text-lg md:text-2xl font-bold text-green-600">
                    R$ {parseFloat(stats?.totalIncome || "0").toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-green-600/50 flex-shrink-0 ml-2" />
            </div>
          </div>

          {/* Total Expenses */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-label text-xs md:text-sm">Despesas</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="stat-value text-lg md:text-2xl font-bold text-red-600">
                    R$ {parseFloat(stats?.totalExpense || "0").toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
              <TrendingDown className="w-6 h-6 md:w-8 md:h-8 text-red-600/50 flex-shrink-0 ml-2" />
            </div>
          </div>
        </div>

        {/* Charts Section - Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Income vs Expenses Chart */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-4">Receitas vs Despesas</h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  />
                  <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-4">Despesas por Categoria</h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: R$ ${value.toLocaleString("pt-BR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}`
                    }
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    fontSize={11}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Nenhuma despesa registrada
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors p-4 md:p-6 space-y-4">
          <h3 className="text-base md:text-lg font-semibold text-foreground">Transações Recentes</h3>
          {!transactions || transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Nenhuma transação registrada</p>
          ) : (
            <div className="space-y-2 overflow-x-auto">
              {transactions.slice(0, 5).map((transaction) => {
                const category = categories?.find((c) => c.id === transaction.categoryId);
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm md:text-base"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 text-xs md:text-sm"
                        style={{ backgroundColor: category?.color }}
                      >
                        {category?.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate text-xs md:text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground truncate">{category?.name}</p>
                      </div>
                    </div>
                    <p
                      className={`font-semibold ml-2 flex-shrink-0 text-xs md:text-sm ${
                        transaction.type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"} R${" "}
                      {parseFloat(transaction.amount).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bank Accounts Summary */}
        {bankAccounts && bankAccounts.length > 0 && (
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors p-4 md:p-6 space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Contas Bancárias</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="p-3 md:p-4 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors"
                >
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">{account.name}</p>
                  <p className="text-sm md:text-lg font-bold text-foreground mt-1">
                    R$ {parseFloat(account.balance || "0").toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{account.bank}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
