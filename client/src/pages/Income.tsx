import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatBRL } from "@/lib/currency";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
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

// Componente de label customizado para o gráfico de pizza
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.04) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Income() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const transactionsQuery = trpc.transactions.list.useQuery({});
  const categoriesQuery = trpc.categories.list.useQuery();
  const bankAccountsQuery = trpc.bankAccounts.list.useQuery();
  const creditCardsQuery = trpc.creditCards.list.useQuery();

  // Combinar e filtrar receitas:
  // - transactions com type = "income" (valores positivos)
  // - creditCardTransactions com valores NEGATIVOS (estornos)
  const income = useMemo(() => {
    const allIncome: any[] = [];

    // Receitas de contas bancárias: type = "income"
    if (transactionsQuery.data) {
      transactionsQuery.data.forEach((tx: any) => {
        const txDate = new Date(tx.date);
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0);

        if (
          txDate.getMonth() + 1 === selectedMonth &&
          txDate.getFullYear() === selectedYear &&
          tx.type === "income"
        ) {
          allIncome.push({
            id: `bank-${tx.id}`,
            date: tx.date,
            description: tx.description,
            categoryId: tx.categoryId,
            amount: Math.abs(amount),
            source: "Conta Bancária",
            accountId: tx.accountId,
          });
        }
      });
    }

    return allIncome.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactionsQuery.data, selectedMonth, selectedYear]);

  // Calcular totais por categoria com cores
  const incomeByCategory = useMemo(() => {
    const grouped: Record<string, { value: number; color: string }> = {};

    income.forEach((inc) => {
      const category = categoriesQuery.data?.find((c: any) => c.id === inc.categoryId);
      const catName = category?.name || "Sem categoria";
      const catColor = category?.color || "#22c55e";

      if (!grouped[catName]) {
        grouped[catName] = { value: 0, color: catColor };
      }
      grouped[catName].value += inc.amount;
    });

    return Object.entries(grouped)
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
      .sort((a: any, b: any) => b.value - a.value);
  }, [income, categoriesQuery.data]);

  const totalIncome = income.reduce((sum: any, inc) => sum + (inc.amount || 0), 0);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

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

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
          <p className="font-semibold mb-1">{label || payload[0]?.name}</p>
          <p className="text-green-600 font-bold">{formatBRL(payload[0]?.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 md:p-6 rounded-lg shadow-lg">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 md:w-8 md:h-8" />
          <div>
            <h1 className="text-xl md:text-3xl font-bold">Receitas</h1>
            <p className="text-green-100 mt-0.5 text-xs md:text-sm">
              Transações income + estornos de cartão
            </p>
          </div>
        </div>
      </div>

      {/* Filtros + Total */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Button variant="outline" size="sm" onClick={handlePreviousMonth} className="h-8 w-8 p-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Select value={selectedMonth.toString()} onValueChange={(v: any) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-28 md:w-32 h-8 text-xs md:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={idx} value={(idx + 1).toString()} className="text-xs md:text-sm">
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(v: any) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-20 md:w-24 h-8 text-xs md:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()} className="text-xs md:text-sm">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="ml-auto">
            <p className="text-xs text-muted-foreground">Total do período</p>
            <p className="text-lg md:text-2xl font-bold text-green-600">{formatBRL(totalIncome)}</p>
          </div>
        </div>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Gráfico de Pizza */}
        <Card className="p-3 md:p-6">
          <h2 className="text-sm md:text-base font-semibold mb-3">Receitas por Categoria</h2>
          {incomeByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={incomeByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {incomeByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value, entry: any) => (
                      <span style={{ color: entry.color, fontSize: 11 }}>
                        {value}: {formatBRL(entry.payload.value)}
                      </span>
                    )}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              Sem receitas neste período
            </div>
          )}
        </Card>

        {/* Gráfico de Barras */}
        <Card className="p-3 md:p-6">
          <h2 className="text-sm md:text-base font-semibold mb-3">Top Categorias</h2>
          {incomeByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={incomeByCategory.slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 60, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: any) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {incomeByCategory.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: number) => formatBRL(v)}
                    style={{ fontSize: 10, fill: "#555" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              Sem receitas neste período
            </div>
          )}
        </Card>
      </div>

      {/* Tabela de Receitas */}
      <Card className="p-3 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm md:text-base font-semibold">Detalhes das Receitas</h2>
          <span className="text-xs text-muted-foreground">{income.length} registros</span>
        </div>
        {income.length > 0 ? (
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <table className="w-full text-xs md:text-sm min-w-[500px]">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-muted-foreground">Data</th>
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-muted-foreground">Descrição</th>
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-muted-foreground">Origem</th>
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-muted-foreground">Conta/Cartão</th>
                  <th className="text-right py-2 px-2 md:px-3 font-medium text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {income.map((inc) => {
                  const category = categoriesQuery.data?.find((c: any) => c.id === inc.categoryId);
                  let accountName = "";
                  if (inc.source === "Conta Bancária") {
                    const account = bankAccountsQuery.data?.find((a: any) => a.id === inc.accountId);
                    accountName = account ? `${account.name} (${account.bank})` : "Conta desconhecida";
                  } else if (inc.source === "Estorno Cartão") {
                    const card = creditCardsQuery.data?.find((c: any) => c.id === inc.cardId);
                    accountName = card?.name || "Cartão desconhecido";
                  }
                  return (
                    <tr key={inc.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2 md:px-3 whitespace-nowrap">
                        {new Date(inc.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 px-2 md:px-3 max-w-[120px] md:max-w-[200px] truncate">
                        {inc.description}
                      </td>
                      <td className="py-2 px-2 md:px-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
                          style={{ backgroundColor: category?.color || "#22c55e" }}
                        >
                          {category?.name || "Sem categoria"}
                        </span>
                      </td>
                      <td className="py-2 px-2 md:px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {inc.source}
                      </td>
                      <td className="py-2 px-2 md:px-3 text-xs text-muted-foreground max-w-[100px] truncate">
                        {accountName}
                      </td>
                      <td className="py-2 px-2 md:px-3 text-right font-semibold text-green-600 whitespace-nowrap">
                        +{formatBRL(inc.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-green-50 dark:bg-green-950/20">
                  <td colSpan={5} className="py-2 px-2 md:px-3 font-semibold text-xs md:text-sm">
                    Total
                  </td>
                  <td className="py-2 px-2 md:px-3 text-right font-bold text-green-600 text-xs md:text-sm">
                    +{formatBRL(totalIncome)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma receita registrada neste período
          </div>
        )}
      </Card>
    </div>
  );
}
