import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./firebase-db";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        profilePhoto: z.string().optional(),
      }).refine(
        (data) => data.name || data.email || data.profilePhoto,
        { message: "At least one field must be provided" }
      ))
      .mutation(async ({ ctx, input }) => {
        let processedInput = { ...input };
        if (input.profilePhoto) {
          try {
            const base64Data = input.profilePhoto;
            const base64String = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
            const buffer = Buffer.from(base64String, "base64");
            const { url } = await storagePut(
              `users/${ctx.user.id}/profile-photo-${Date.now()}.jpg`,
              buffer,
              "image/jpeg"
            );
            processedInput.profilePhoto = url;
          } catch {
            throw new Error("Falha ao fazer upload de foto");
          }
        }
        return db.updateUserProfile(ctx.user.id, processedInput);
      }),

    getProfileHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
      .query(({ ctx, input }) => db.getProfileHistory(ctx.user.id, input?.limit)),
  }),

  // ============= CATEGORIES =============
  categories: router({
    list: protectedProcedure.query(({ ctx }) => db.getCategories(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(({ ctx, input }) => db.getCategoryById(input.id, ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["income", "expense"]),
        color: z.string().regex(/^#[0-9A-F]{6}$/i),
        icon: z.string().default("tag"),
      }))
      .mutation(({ ctx, input }) => db.createCategory(ctx.user.id, input)),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateCategory(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => db.deleteCategory(input.id, ctx.user.id)),
  }),

  // ============= CATEGORIZATION RULES =============
  categorizationRules: router({
    list: protectedProcedure.query(({ ctx }) => db.getCategorizationRules(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(({ ctx, input }) => db.getCategorizationRuleById(input.id, ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        categoryId: z.string(),
        keywords: z.array(z.string().min(1)),
        matchType: z.enum(["contains", "exact", "startsWith", "endsWith"]).default("contains"),
        caseSensitive: z.boolean().default(false),
        priority: z.number().default(0),
      }))
      .mutation(({ ctx, input }) => db.createCategorizationRule(ctx.user.id, input)),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        categoryId: z.string().optional(),
        keywords: z.array(z.string().min(1)).optional(),
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
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => db.deleteCategorizationRule(input.id, ctx.user.id)),
  }),

  // ============= BANK ACCOUNTS =============
  bankAccounts: router({
    list: protectedProcedure.query(({ ctx }) => db.getBankAccounts(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(({ ctx, input }) => db.getBankAccountById(input.id, ctx.user.id)),

    getInitialBalance: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .query(({ ctx, input }) =>
        db.getInitialBalanceForMonth(ctx.user.id, input.accountId, input.month, input.year)
      ),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        bank: z.string().min(1),
        accountNumber: z.string().optional(),
        initialBalance: z.string(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      }))
      .mutation(({ ctx, input }) => db.createBankAccount(ctx.user.id, input)),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        bank: z.string().optional(),
        accountNumber: z.string().optional(),
        balance: z.string().optional(),
        initialBalance: z.string().optional(),
        finalBalance: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateBankAccount(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => db.deleteBankAccount(input.id, ctx.user.id)),

    updateMonthlyBalance: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        month: z.number().min(1).max(12),
        year: z.number(),
        initialBalance: z.string(),
      }))
      .mutation(({ ctx, input }) =>
        db.upsertMonthlyBalance(ctx.user.id, input.accountId, input.month, input.year, input.initialBalance)
      ),

    resetMonthlyBalance: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .mutation(({ ctx, input }) =>
        db.deleteMonthlyBalance(ctx.user.id, input.accountId, input.month, input.year)
      ),

    getMonthlyBalance: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .query(({ ctx, input }) =>
        db.getInitialBalanceForMonth(ctx.user.id, input.accountId, input.month, input.year)
      ),
  }),

  // ============= TRANSACTIONS =============
  transactions: router({
    list: protectedProcedure
      .input(z.object({
        accountId: z.string().optional(),
        categoryId: z.string().optional(),
        type: z.enum(["income", "expense"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(({ ctx, input }) => db.getTransactions(ctx.user.id, input)),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(({ ctx, input }) => db.getTransactionById(input.id, ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        categoryId: z.string(),
        accountId: z.string(),
        type: z.enum(["income", "expense"]),
        description: z.string().min(1),
        amount: z.string(),
        date: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.createTransaction(ctx.user.id, input)),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        categoryId: z.string().optional(),
        type: z.enum(["income", "expense"]).optional(),
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
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => db.deleteTransaction(input.id, ctx.user.id)),

    applyRules: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.applyCategorizationRulesToAccount(ctx.user.id, input.accountId, input.startDate, input.endDate)),

    importFromOFX: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        ofxContent: z.string(),
        fileName: z.string(),
      }))
      .mutation(({ ctx, input }) => db.importTransactionsFromOFX(ctx.user.id, input)),
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
      .input(z.object({ id: z.string() }))
      .query(({ ctx, input }) => db.getBudgetById(input.id, ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        categoryId: z.string(),
        month: z.number().min(1).max(12),
        year: z.number(),
        limit: z.string(),
      }))
      .mutation(({ ctx, input }) => db.createBudget(ctx.user.id, input)),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        limit: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateBudget(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => db.deleteBudget(input.id, ctx.user.id)),
  }),

  // ============= CREDIT CARDS =============
  creditCards: router({
    list: protectedProcedure.query(({ ctx }) => db.getCreditCards(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
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
        id: z.string(),
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
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => db.deleteCreditCard(input.id, ctx.user.id)),

    getTransactions: protectedProcedure
      .input(z.object({
        cardId: z.string(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .query(({ ctx, input }) => db.getCreditCardTransactionsByMonth(ctx.user.id, input.cardId, input.month, input.year)),

    getUtilization: protectedProcedure
      .input(z.object({
        cardId: z.string(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .query(({ ctx, input }) => db.getCreditCardUtilization(ctx.user.id, input.cardId, input.month, input.year)),
  }),

  // ============= CREDIT CARD TRANSACTIONS =============
  creditCardTransactions: router({
    list: protectedProcedure
      .input(z.object({
        cardId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(({ ctx, input }) => {
        if (input?.startDate && input?.endDate) {
          return db.getCreditCardTransactionsByDate(ctx.user.id, input.startDate, input.endDate);
        }
        return db.getCreditCardTransactions(ctx.user.id, input?.cardId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(({ ctx, input }) => db.getCreditCardTransactionById(input.id, ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        cardId: z.string(),
        categoryId: z.string().optional(),
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
        id: z.string(),
        categoryId: z.string().optional(),
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
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => db.deleteCreditCardTransaction(input.id, ctx.user.id)),

    moveToNextBilling: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const tx = await db.getCreditCardTransactionById(input.id, ctx.user.id);
        if (!tx) throw new Error("Transacao nao encontrada");
        const currentDue = new Date((tx as any).dueDate);
        const nextDue = new Date(currentDue.getFullYear(), currentDue.getMonth() + 1, currentDue.getDate());
        return db.updateCreditCardTransaction(input.id, ctx.user.id, { dueDate: nextDue });
      }),

    importFromPDF: protectedProcedure
      .input(z.object({
        cardId: z.string(),
        pdfBase64: z.string(),
        fileName: z.string(),
      }))
      .mutation(({ ctx, input }) => db.importCreditCardTransactionsFromPDF(ctx.user.id, input)),

    importFromOFX: protectedProcedure
      .input(z.object({
        cardId: z.string(),
        ofxContent: z.string(),
        fileName: z.string(),
      }))
      .mutation(({ ctx, input }) => db.importCreditCardTransactionsFromOFX(ctx.user.id, input)),
  }),

  // ============= DASHBOARD =============
  dashboard: router({
    stats: protectedProcedure
      .input(z.object({ month: z.number(), year: z.number() }))
      .query(({ ctx, input }) => db.getDashboardStats(ctx.user.id, input.month, input.year)),
  }),

  accounts: router({
    list: protectedProcedure.query(({ ctx }) => db.getBankAccounts(ctx.user.id)),
  }),

  files: router({
    checkDuplicates: protectedProcedure
      .input(z.object({
        entityType: z.enum(["creditCard", "bankAccount"]),
        entityId: z.string(),
        transactions: z.array(z.object({
          date: z.date(),
          description: z.string(),
          amount: z.string(),
        })),
        dateToleranceDays: z.number().optional(),
        descriptionSimilarityThreshold: z.number().optional(),
        amountTolerancePercent: z.number().optional(),
      }))
      .query(({ ctx, input }) => db.checkDuplicatesForImport(ctx.user.id, input)),

    import: protectedProcedure
      .input(z.object({
        entityType: z.enum(["creditCard", "bankAccount"]),
        entityId: z.string(),
        fileContent: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        transactions: z.array(z.object({
          date: z.date(),
          description: z.string(),
          amount: z.string(),
          type: z.enum(["income", "expense"]),
        })).optional(),
        skipDuplicates: z.boolean().optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(({ ctx, input }) => db.importFile(ctx.user.id, input)),
  }),

  importHistory: router({
    list: protectedProcedure
      .input(z.object({
        entityType: z.enum(["creditCard", "bankAccount"]).optional(),
        entityId: z.string().optional(),
      }).optional())
      .query(({ ctx, input }) => db.getImportHistory(ctx.user.id, input?.entityType, input?.entityId)),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(({ ctx, input }) => db.getImportHistoryById(ctx.user.id, input.id)),

    statistics: protectedProcedure
      .input(z.object({
        entityType: z.enum(["creditCard", "bankAccount"]).optional(),
      }).optional())
      .query(({ ctx, input }) => db.getImportStatistics(ctx.user.id, input?.entityType)),
  }),
});

export type AppRouter = typeof appRouter;
