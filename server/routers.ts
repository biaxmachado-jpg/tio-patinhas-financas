import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============= CATEGORIES =============
  categories: router({
    list: protectedProcedure.query(({ ctx }) => db.getCategories(ctx.user.id)),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getCategoryById(input.id, ctx.user.id)),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["income", "expense"]),
        color: z.string().regex(/^#[0-9A-F]{6}$/i),
        icon: z.string().min(1),
      }))
      .mutation(({ ctx, input }) => db.createCategory(ctx.user.id, input)),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        icon: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateCategory(id, ctx.user.id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteCategory(input.id, ctx.user.id)),
  }),

  // ============= BANK ACCOUNTS =============
  bankAccounts: router({
    list: protectedProcedure.query(({ ctx }) => db.getBankAccounts(ctx.user.id)),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getBankAccountById(input.id, ctx.user.id)),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        bank: z.string().min(1),
        accountNumber: z.string().optional(),
        initialBalance: z.string(),
      }))
      .mutation(({ ctx, input }) => db.createBankAccount(ctx.user.id, input)),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        bank: z.string().optional(),
        accountNumber: z.string().optional(),
        balance: z.string().optional(),
        finalBalance: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateBankAccount(id, ctx.user.id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteBankAccount(input.id, ctx.user.id)),
  }),

  // ============= TRANSACTIONS =============
  transactions: router({
    list: protectedProcedure
      .input(z.object({
        accountId: z.number().optional(),
        categoryId: z.number().optional(),
        type: z.enum(["income", "expense"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(({ ctx, input }) => db.getTransactions(ctx.user.id, input)),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getTransactionById(input.id, ctx.user.id)),
    
    create: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        accountId: z.number(),
        type: z.enum(["income", "expense"]),
        description: z.string().min(1),
        amount: z.string(),
        date: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.createTransaction(ctx.user.id, input)),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        categoryId: z.number().optional(),
        description: z.string().optional(),
        amount: z.string().optional(),
        date: z.date().optional(),
        notes: z.string().optional(),
        reconciled: z.boolean().optional(),
        reconciledAt: z.date().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateTransaction(id, ctx.user.id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteTransaction(input.id, ctx.user.id)),
  }),

  // ============= BUDGETS =============
  budgets: router({
    list: protectedProcedure
      .input(z.object({
        month: z.number().optional(),
        year: z.number().optional(),
      }).optional())
      .query(({ ctx, input }) => db.getBudgets(ctx.user.id, input?.month, input?.year)),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getBudgetById(input.id, ctx.user.id)),
    
    create: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        month: z.number().min(1).max(12),
        year: z.number(),
        limit: z.string(),
      }))
      .mutation(({ ctx, input }) => db.createBudget(ctx.user.id, input)),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        limit: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateBudget(id, ctx.user.id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteBudget(input.id, ctx.user.id)),
  }),

  // ============= CATEGORIZATION RULES =============
  categorizationRules: router({
    list: protectedProcedure.query(({ ctx }) => db.getCategorizationRules(ctx.user.id)),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getCategorizationRuleById(input.id, ctx.user.id)),
    
    create: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        keywords: z.string(),
        matchType: z.enum(["contains", "exact", "startsWith", "endsWith"]),
        caseSensitive: z.boolean(),
        priority: z.number(),
        enabled: z.boolean(),
      }))
      .mutation(({ ctx, input }) => db.createCategorizationRule(ctx.user.id, input)),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        categoryId: z.number().optional(),
        keywords: z.string().optional(),
        matchType: z.enum(["contains", "exact", "startsWith", "endsWith"]).optional(),
        caseSensitive: z.boolean().optional(),
        priority: z.number().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateCategorizationRule(id, ctx.user.id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteCategorizationRule(input.id, ctx.user.id)),
  }),

  // ============= CREDIT CARDS =============
  creditCards: router({
    list: protectedProcedure.query(({ ctx }) => db.getCreditCards(ctx.user.id)),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getCreditCardById(input.id, ctx.user.id)),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        brand: z.string().min(1),
        limit: z.string(),
        dueDay: z.number().min(1).max(31),
        closingDay: z.number().min(1).max(31),
        color: z.string().regex(/^#[0-9A-F]{6}$/i),
        lastFourDigits: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.createCreditCard(ctx.user.id, input)),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        brand: z.string().optional(),
        limit: z.string().optional(),
        dueDay: z.number().optional(),
        closingDay: z.number().optional(),
        color: z.string().optional(),
        lastFourDigits: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateCreditCard(id, ctx.user.id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteCreditCard(input.id, ctx.user.id)),
    
    getTransactions: protectedProcedure
      .input(z.object({
        cardId: z.number(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .query(({ ctx, input }) => db.getCreditCardTransactionsByMonth(ctx.user.id, input.cardId, input.month, input.year)),
    
    getUtilization: protectedProcedure
      .input(z.object({
        cardId: z.number(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .query(({ ctx, input }) => db.getCreditCardUtilization(ctx.user.id, input.cardId, input.month, input.year)),
  }),

  // ============= CREDIT CARD TRANSACTIONS =============
  creditCardTransactions: router({
    list: protectedProcedure
      .input(z.object({ cardId: z.number().optional() }).optional())
      .query(({ ctx, input }) => db.getCreditCardTransactions(ctx.user.id, input?.cardId)),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getCreditCardTransactionById(input.id, ctx.user.id)),
    
    create: protectedProcedure
      .input(z.object({
        cardId: z.number(),
        categoryId: z.number(),
        description: z.string().min(1),
        amount: z.string(),
        date: z.date(),
        dueDate: z.date().optional(),
        installments: z.number().optional(),
        currentInstallment: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.createCreditCardTransaction(ctx.user.id, input)),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        categoryId: z.number().optional(),
        description: z.string().optional(),
        amount: z.string().optional(),
        date: z.date().optional(),
        dueDate: z.date().optional(),
        installments: z.number().optional(),
        currentInstallment: z.number().optional(),
        paid: z.boolean().optional(),
        paidAt: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateCreditCardTransaction(id, ctx.user.id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteCreditCardTransaction(input.id, ctx.user.id)),
  }),

   // ============= DASHBOARD =============
  dashboard: router({
    stats: protectedProcedure
      .input(z.object({ month: z.number(), year: z.number() }))
      .query(({ ctx, input }) => db.getDashboardStats(ctx.user.id, input.month, input.year)),
  }),
  
  // Aliases para compatibilidade com layout original
  accounts: router({
    list: protectedProcedure.query(({ ctx }) => db.getBankAccounts(ctx.user.id)),
  }),
});
export type AppRouter = typeof appRouter;
