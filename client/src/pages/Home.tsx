import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { ArrowRight, TrendingUp, Wallet, CreditCard, PieChart } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return null; // Redirect handled by App.tsx
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Tio Patinhas Finanças</h1>
          </div>
          <Button asChild>
            <a href={getLoginUrl()}>Entrar</a>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Controle suas finanças com elegância
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma sofisticada para gerenciar suas contas bancárias, cartões de crédito e acompanhar cada centavo com precisão e estilo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gap-2">
              <a href={getLoginUrl()}>
                Começar Agora
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg">
              Ver Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-20">
        <div className="space-y-12">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold text-foreground">Funcionalidades Completas</h3>
            <p className="text-muted-foreground">Tudo que você precisa para dominar suas finanças</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground">Dashboard Inteligente</h4>
              <p className="text-muted-foreground">
                Visualize seu resumo financeiro com gráficos mensais de receitas e despesas em tempo real.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground">Gestão de Contas</h4>
              <p className="text-muted-foreground">
                Crie e gerencie múltiplas contas bancárias com rastreamento automático de saldo.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground">Cartões de Crédito</h4>
              <p className="text-muted-foreground">
                Cadastre cartões, acompanhe limites e organize transações por vencimento.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground">Categorização Automática</h4>
              <p className="text-muted-foreground">
                Regras inteligentes categorizam suas transações automaticamente por palavras-chave.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-12 text-center space-y-6">
          <h3 className="text-3xl font-bold text-foreground">Pronto para começar?</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Junte-se a milhares de usuários que já dominam suas finanças com Tio Patinhas Finanças.
          </p>
          <Button asChild size="lg" className="gap-2">
            <a href={getLoginUrl()}>
              Acessar Agora
              <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-20">
        <div className="container py-8 text-center text-muted-foreground text-sm">
          <p>© 2026 Tio Patinhas Finanças. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
