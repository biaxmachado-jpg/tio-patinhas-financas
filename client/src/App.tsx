import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import BankAccounts from "./pages/BankAccounts";
import CreditCards from "./pages/CreditCards";
import Categories from "./pages/Categories";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import CategorizationRules from "./pages/CategorizationRules";
import Reconciliation from "./pages/Reconciliation";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";
import { getLoginUrl } from "./const";

function Router() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && window.location.pathname === "/") {
        setLocation("/dashboard");
      } else if (!isAuthenticated && window.location.pathname !== "/") {
        setLocation(getLoginUrl());
      }
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/bank-accounts" component={BankAccounts} />
      <Route path="/credit-cards" component={CreditCards} />
      <Route path="/categories" component={Categories} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/budgets" component={Budgets} />
      <Route path="/categorization-rules" component={CategorizationRules} />
      <Route path="/reconciliation" component={Reconciliation} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
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
