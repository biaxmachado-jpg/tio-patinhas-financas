"use client";

import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Banknote, CreditCard, Upload, ChevronRight } from "lucide-react";

export default function Importar() {
  const [, navigate] = useLocation();
  const accountsQuery = trpc.bankAccounts.list.useQuery();
  const cardsQuery = trpc.creditCards.list.useQuery();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Upload className="h-7 w-7" />
            Importar Transações
          </h1>
          <p className="text-muted-foreground mt-1">
            Escolha a conta ou o cartão para subir um extrato ou fatura (PDF, CSV, XLSX ou OFX) — a IA lê o
            arquivo e já classifica as transações pra você.
          </p>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Banknote className="h-5 w-5 text-muted-foreground" />
            Contas Bancárias
          </h2>
          {accountsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !accountsQuery.data || accountsQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta cadastrada ainda.{" "}
              <button className="underline" onClick={() => navigate("/contas")}>
                Cadastrar uma conta
              </button>
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {accountsQuery.data.map((account) => (
                <button
                  key={account.id}
                  onClick={() => navigate(`/contas/${account.id}/importar`)}
                  className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors text-left"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: account.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{account.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{account.bank}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            Cartões de Crédito
          </h2>
          {cardsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !cardsQuery.data || cardsQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum cartão cadastrado ainda.{" "}
              <button className="underline" onClick={() => navigate("/cartoes")}>
                Cadastrar um cartão
              </button>
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cardsQuery.data.map((card: { id: number; name: string; brand: string; color: string }) => (
                <button
                  key={card.id}
                  onClick={() => navigate(`/cartoes/${card.id}/importar`)}
                  className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors text-left"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: card.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{card.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{card.brand}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
