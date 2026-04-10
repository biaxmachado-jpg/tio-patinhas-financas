import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import BankAccounts from "./pages/BankAccounts";
import BankAccountDetail from "./pages/BankAccountDetail";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import CreditCards from "./pages/CreditCards";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path="/categorias">
        <DashboardLayout>
          <Categories />
        </DashboardLayout>
      </Route>
      <Route path="/contas">
        <DashboardLayout>
          <BankAccounts />
        </DashboardLayout>
      </Route>
      <Route path="/contas/:accountId">
        <BankAccountDetail />
      </Route>
      <Route path="/despesas">
        <DashboardLayout>
          <Transactions />
        </DashboardLayout>
      </Route>
      <Route path="/receitas">
        <DashboardLayout>
          <Transactions />
        </DashboardLayout>
      </Route>
      <Route path="/orcamentos">
        <DashboardLayout>
          <Budgets />
        </DashboardLayout>
      </Route>
      <Route path="/cartoes">
        <DashboardLayout>
          <CreditCards />
        </DashboardLayout>
      </Route>
      <Route path="/cartoes/:cardId">
        <DashboardLayout>
          <CreditCards />
        </DashboardLayout>
      </Route>
      <Route path="/banco-de-dados">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
