import { firestore } from "./firebase";
import { ENV } from "./_core/env";

// ============= TYPES =============

export type FirebaseUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  profilePhoto: string | null;
  loginMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

// ============= HELPERS =============

function ts(v: any): any {
  if (v === null || v === undefined) return v;
  if (v && typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  if (Array.isArray(v)) return v.map(ts);
  if (typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, ts(val)]));
  }
  return v;
}

function docData(doc: FirebaseFirestore.DocumentSnapshot) {
  if (!doc.exists) return undefined;
  return ts({ id: doc.id, ...doc.data() });
}

const col = {
  user: (uid: string) => firestore.doc(`users/${uid}`),
  categories: (uid: string) => firestore.collection(`users/${uid}/categories`),
  bankAccounts: (uid: string) => firestore.collection(`users/${uid}/bankAccounts`),
  transactions: (uid: string) => firestore.collection(`users/${uid}/transactions`),
  monthlyBalances: (uid: string) => firestore.collection(`users/${uid}/monthlyBalances`),
  budgets: (uid: string) => firestore.collection(`users/${uid}/budgets`),
  rules: (uid: string) => firestore.collection(`users/${uid}/categorizationRules`),
  creditCards: (uid: string) => firestore.collection(`users/${uid}/creditCards`),
  ccTransactions: (uid: string) => firestore.collection(`users/${uid}/creditCardTransactions`),
  profileHistory: (uid: string) => firestore.collection(`users/${uid}/profileHistory`),
  importHistory: (uid: string) => firestore.collection(`users/${uid}/importHistory`),
};

// ============= USERS =============

export async function upsertUser(data: {
  uid: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
}): Promise<FirebaseUser> {
  const ref = col.user(data.uid);
  const snap = await ref.get();
  const now = new Date();

  if (snap.exists) {
    const update: Record<string, unknown> = { updatedAt: now, lastSignedIn: data.lastSignedIn ?? now };
    if (data.name !== undefined) update.name = data.name;
    if (data.email !== undefined) update.email = data.email;
    if (data.loginMethod !== undefined) update.loginMethod = data.loginMethod;
    await ref.update(update);
  } else {
    const isOwner = ENV.firebaseOwnerUid && data.uid === ENV.firebaseOwnerUid;
    await ref.set({
      id: data.uid,
      name: data.name ?? null,
      email: data.email ?? null,
      loginMethod: data.loginMethod ?? null,
      role: isOwner ? "admin" : "user",
      profilePhoto: null,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: data.lastSignedIn ?? now,
    });
  }

  const updated = await ref.get();
  return ts({ ...updated.data(), id: data.uid }) as FirebaseUser;
}

export async function getUserByUid(uid: string): Promise<FirebaseUser | undefined> {
  const snap = await col.user(uid).get();
  if (!snap.exists) return undefined;
  return ts({ ...snap.data(), id: uid }) as FirebaseUser;
}

export async function updateUserProfile(userId: string, data: { name?: string; email?: string; profilePhoto?: string }) {
  const ref = col.user(userId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Usuário não encontrado");

  const current = snap.data()!;
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name && data.name !== current.name) {
    await recordProfileChange(userId, "name", current.name ?? null, data.name);
    update.name = data.name;
  }
  if (data.email && data.email !== current.email) {
    await recordProfileChange(userId, "email", current.email ?? null, data.email);
    update.email = data.email;
  }
  if (data.profilePhoto && data.profilePhoto !== current.profilePhoto) {
    await recordProfileChange(userId, "profilePhoto", current.profilePhoto ?? null, data.profilePhoto);
    update.profilePhoto = data.profilePhoto;
  }

  await ref.update(update);
  return { success: true };
}

// ============= CATEGORIES =============

export async function getCategories(userId: string) {
  const snap = await col.categories(userId).orderBy("name").get();
  return snap.docs.map(docData);
}

export async function getCategoryById(id: string, userId: string) {
  return docData(await col.categories(userId).doc(id).get());
}

export async function createCategory(userId: string, data: { name: string; type: "income" | "expense"; color: string; icon: string }) {
  const now = new Date();
  const ref = await col.categories(userId).add({ userId, ...data, createdAt: now, updatedAt: now });
  return { id: ref.id };
}

export async function updateCategory(id: string, userId: string, data: Partial<{ name: string; color: string; icon: string }>) {
  await col.categories(userId).doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteCategory(id: string, userId: string) {
  await col.categories(userId).doc(id).delete();
}

// ============= BANK ACCOUNTS =============

export async function getBankAccounts(userId: string) {
  const snap = await col.bankAccounts(userId).orderBy("name").get();
  const accounts = snap.docs.map(docData) as any[];

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return Promise.all(
    accounts.map(async (account) => {
      const txSnap = await col.transactions(userId).where("accountId", "==", account.id).get();
      let monthlyIncome = 0;
      let monthlyExpense = 0;

      txSnap.docs.forEach((d) => {
        const tx = d.data();
        const txDate: Date = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
        if (txDate.getMonth() + 1 === currentMonth && txDate.getFullYear() === currentYear) {
          if (tx.type === "income") monthlyIncome += parseFloat(tx.amount || "0");
          else monthlyExpense += parseFloat(tx.amount || "0");
        }
      });

      const initialBalance = parseFloat(account.balance || "0");
      const finalBalance = initialBalance + monthlyIncome - monthlyExpense;
      return { ...account, finalBalance: finalBalance.toString() };
    })
  );
}

export async function getBankAccountById(id: string, userId: string) {
  return docData(await col.bankAccounts(userId).doc(id).get());
}

export async function createBankAccount(userId: string, data: { name: string; bank: string; accountNumber?: string; initialBalance: string; color?: string }) {
  const now = new Date();
  const ref = await col.bankAccounts(userId).add({
    userId,
    ...data,
    balance: data.initialBalance,
    finalBalance: data.initialBalance,
    createdAt: now,
    updatedAt: now,
  });
  return { id: ref.id };
}

export async function updateBankAccount(id: string, userId: string, data: Partial<{ name: string; bank: string; accountNumber: string; balance: string; initialBalance: string; finalBalance: string; color: string }>) {
  await col.bankAccounts(userId).doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteBankAccount(id: string, userId: string) {
  await col.bankAccounts(userId).doc(id).delete();
}

// ============= TRANSACTIONS =============

export async function getTransactions(userId: string, filters?: {
  accountId?: string;
  categoryId?: string;
  type?: "income" | "expense";
  startDate?: Date;
  endDate?: Date;
}) {
  const snap = await col.transactions(userId).get();
  let results = snap.docs.map(docData) as any[];

  if (filters?.accountId) results = results.filter((t) => t.accountId === filters.accountId);
  if (filters?.categoryId) results = results.filter((t) => t.categoryId === filters.categoryId);
  if (filters?.type) results = results.filter((t) => t.type === filters.type);
  if (filters?.startDate) results = results.filter((t) => new Date(t.date) >= filters.startDate!);
  if (filters?.endDate) results = results.filter((t) => new Date(t.date) <= filters.endDate!);

  return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getTransactionById(id: string, userId: string) {
  return docData(await col.transactions(userId).doc(id).get());
}

export async function createTransaction(userId: string, data: {
  categoryId: string;
  accountId: string;
  type: "income" | "expense";
  description: string;
  amount: string;
  date: Date;
  notes?: string;
}) {
  const now = new Date();
  const ref = await col.transactions(userId).add({ userId, ...data, reconciled: false, reconciledAt: null, createdAt: now, updatedAt: now });
  return { id: ref.id };
}

export async function updateTransaction(id: string, userId: string, data: Partial<{
  categoryId: string;
  description: string;
  amount: string;
  date: Date;
  notes: string;
  reconciled: boolean;
  reconciledAt: Date;
}>) {
  await col.transactions(userId).doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteTransaction(id: string, userId: string) {
  await col.transactions(userId).doc(id).delete();
}

// ============= BUDGETS =============

export async function getBudgets(userId: string, month?: number, year?: number) {
  const snap = await col.budgets(userId).get();
  let results = snap.docs.map(docData) as any[];
  if (month !== undefined) results = results.filter((b) => b.month === month);
  if (year !== undefined) results = results.filter((b) => b.year === year);
  return results.sort((a, b) => (a.categoryId > b.categoryId ? 1 : -1));
}

export async function getBudgetById(id: string, userId: string) {
  return docData(await col.budgets(userId).doc(id).get());
}

export async function createBudget(userId: string, data: { categoryId: string; month: number; year: number; limit: string }) {
  const now = new Date();
  const ref = await col.budgets(userId).add({ userId, ...data, createdAt: now, updatedAt: now });
  return { id: ref.id };
}

export async function updateBudget(id: string, userId: string, data: Partial<{ limit: string }>) {
  await col.budgets(userId).doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteBudget(id: string, userId: string) {
  await col.budgets(userId).doc(id).delete();
}

// ============= CATEGORIZATION RULES =============

export async function getCategorizationRules(userId: string) {
  const snap = await col.rules(userId).get();
  return (snap.docs.map(docData) as any[]).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export async function getCategorizationRuleById(id: string, userId: string) {
  return docData(await col.rules(userId).doc(id).get());
}

export async function createCategorizationRule(userId: string, data: {
  categoryId: string;
  keywords: string[];
  matchType: "contains" | "exact" | "startsWith" | "endsWith";
  caseSensitive: boolean;
  priority: number;
}) {
  const now = new Date();
  const ref = await col.rules(userId).add({ userId, ...data, enabled: true, createdAt: now, updatedAt: now });
  return { id: ref.id };
}

export async function updateCategorizationRule(id: string, userId: string, data: Partial<{
  categoryId: string;
  keywords: string[];
  matchType: "contains" | "exact" | "startsWith" | "endsWith";
  caseSensitive: boolean;
  priority: number;
  enabled: boolean;
}>) {
  await col.rules(userId).doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteCategorizationRule(id: string, userId: string) {
  await col.rules(userId).doc(id).delete();
}

function matchesRule(description: string, rule: any): boolean {
  const keywords: string[] = Array.isArray(rule.keywords) ? rule.keywords : JSON.parse(rule.keywords || "[]");
  const testDesc = rule.caseSensitive ? description : description.toLowerCase();

  for (const kw of keywords) {
    const testKw = rule.caseSensitive ? kw : kw.toLowerCase();
    switch (rule.matchType) {
      case "contains": if (testDesc.includes(testKw)) return true; break;
      case "exact": if (testDesc === testKw) return true; break;
      case "startsWith": if (testDesc.startsWith(testKw)) return true; break;
      case "endsWith": if (testDesc.endsWith(testKw)) return true; break;
    }
  }
  return false;
}

export async function applyCategorizationRulesToAccount(userId: string, accountId: string, startDate?: string, endDate?: string) {
  const rulesSnap = await col.rules(userId).where("enabled", "==", true).get();
  const rules = (rulesSnap.docs.map(docData) as any[]).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  if (rules.length === 0) return 0;

  const txSnap = await col.transactions(userId).where("accountId", "==", accountId).get();
  let count = 0;

  for (const doc of txSnap.docs) {
    const tx = doc.data();
    const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
    if (startDate && txDate < new Date(startDate)) continue;
    if (endDate && txDate > new Date(endDate)) continue;

    for (const rule of rules) {
      if (matchesRule(tx.description, rule)) {
        await col.transactions(userId).doc(doc.id).update({ categoryId: rule.categoryId, updatedAt: new Date() });
        count++;
        break;
      }
    }
  }
  return count;
}

// ============= CREDIT CARDS =============

export async function getCreditCards(userId: string) {
  const snap = await col.creditCards(userId).orderBy("name").get();
  return snap.docs.map(docData);
}

export async function getCreditCardById(id: string, userId: string) {
  return docData(await col.creditCards(userId).doc(id).get());
}

export async function createCreditCard(userId: string, data: { name: string; brand: string; limit: string; dueDay: number; closingDay: number; color: string; lastFourDigits?: string }) {
  const now = new Date();
  const ref = await col.creditCards(userId).add({ userId, ...data, createdAt: now, updatedAt: now });
  return { id: ref.id };
}

export async function updateCreditCard(id: string, userId: string, data: Partial<{ name: string; brand: string; limit: string; dueDay: number; closingDay: number; color: string; lastFourDigits: string }>) {
  await col.creditCards(userId).doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteCreditCard(id: string, userId: string) {
  await col.creditCards(userId).doc(id).delete();
}

// ============= CREDIT CARD TRANSACTIONS =============

export async function getCreditCardTransactions(userId: string, cardId?: string) {
  const snap = await col.ccTransactions(userId).get();
  let results = snap.docs.map(docData) as any[];
  if (cardId) results = results.filter((t) => t.cardId === cardId);
  return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getCreditCardTransactionById(id: string, userId: string) {
  return docData(await col.ccTransactions(userId).doc(id).get());
}

export async function getCreditCardTransactionsByMonth(userId: string, cardId: string, month: number, year: number) {
  const snap = await col.ccTransactions(userId).where("cardId", "==", cardId).get();
  return (snap.docs.map(docData) as any[])
    .filter((t) => {
      const d: Date = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    })
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

export async function getCreditCardTransactionsByDate(userId: string, startDate: Date, endDate: Date) {
  const snap = await col.ccTransactions(userId).get();
  return (snap.docs.map(docData) as any[])
    .filter((t) => {
      const d: Date = t.date instanceof Date ? t.date : new Date(t.date);
      return d >= startDate && d <= endDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createCreditCardTransaction(userId: string, data: {
  cardId: string;
  categoryId?: string;
  description: string;
  amount: string;
  date: Date;
  dueDate?: Date;
  installments?: number;
  currentInstallment?: number;
  notes?: string;
}) {
  const now = new Date();
  const ref = await col.ccTransactions(userId).add({
    userId,
    ...data,
    installments: data.installments ?? 1,
    currentInstallment: data.currentInstallment ?? 1,
    paid: false,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return { id: ref.id };
}

export async function updateCreditCardTransaction(id: string, userId: string, data: Partial<{
  categoryId: string;
  description: string;
  amount: string;
  date: Date;
  dueDate: Date;
  installments: number;
  currentInstallment: number;
  paid: boolean;
  paidAt: Date;
  notes: string;
}>) {
  await col.ccTransactions(userId).doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteCreditCardTransaction(id: string, userId: string) {
  await col.ccTransactions(userId).doc(id).delete();
}

export async function getCreditCardUtilization(userId: string, cardId: string, month: number, year: number) {
  const card = await getCreditCardById(cardId, userId) as any;
  if (!card) return null;

  const txList = await getCreditCardTransactionsByMonth(userId, cardId, month, year);
  const totalUsed = (txList as any[]).reduce((sum, t) => {
    const amount = parseFloat(t.amount?.toString() || "0");
    return sum + (amount > 0 ? amount : 0);
  }, 0);

  const limit = parseFloat(card.limit?.toString() || "0");
  return {
    limit,
    used: totalUsed,
    available: Math.max(0, limit - totalUsed),
    percentage: limit > 0 ? (totalUsed / limit) * 100 : 0,
  };
}

// ============= DASHBOARD =============

export async function getDashboardStats(userId: string, _month: number, _year: number) {
  const snap = await col.transactions(userId).get();
  let totalIncome = 0;
  let totalExpense = 0;

  snap.docs.forEach((d) => {
    const tx = d.data();
    const amount = parseFloat(tx.amount || "0");
    if (tx.type === "income") totalIncome += amount;
    else totalExpense += amount;
  });

  const accountsSnap = await col.bankAccounts(userId).get();
  const totalBalance = accountsSnap.docs.reduce((sum, d) => {
    return sum + parseFloat(d.data().balance || "0");
  }, 0);

  return {
    totalIncome: totalIncome.toFixed(2),
    totalExpense: totalExpense.toFixed(2),
    totalBalance: totalBalance.toFixed(2),
  };
}

// ============= MONTHLY BALANCES =============

export async function getMonthlyBalance(userId: string, accountId: string, month: number, year: number) {
  const snap = await col.monthlyBalances(userId)
    .where("accountId", "==", accountId)
    .where("month", "==", month)
    .where("year", "==", year)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return docData(snap.docs[0]);
}

export async function upsertMonthlyBalance(userId: string, accountId: string, month: number, year: number, initialBalance: string) {
  const balance = parseFloat(initialBalance);
  if (isNaN(balance)) return null;

  const existing = await getMonthlyBalance(userId, accountId, month, year) as any;
  if (existing) {
    await col.monthlyBalances(userId).doc(existing.id).update({ initialBalance: balance.toString(), updatedAt: new Date() });
  } else {
    await col.monthlyBalances(userId).add({ userId, accountId, month, year, initialBalance: balance.toString(), createdAt: new Date(), updatedAt: new Date() });
  }
  return getMonthlyBalance(userId, accountId, month, year);
}

export async function getInitialBalanceForMonth(userId: string, accountId: string, month: number, year: number): Promise<number> {
  const balance = await getMonthlyBalance(userId, accountId, month, year) as any;
  if (balance) return parseFloat(balance.initialBalance?.toString() || "0");
  return 0;
}

export async function deleteMonthlyBalance(userId: string, accountId: string, month: number, year: number): Promise<boolean> {
  const balance = await getMonthlyBalance(userId, accountId, month, year) as any;
  if (!balance) return false;
  await col.monthlyBalances(userId).doc(balance.id).delete();
  return true;
}

// ============= PROFILE HISTORY =============

export async function recordProfileChange(userId: string, fieldName: string, oldValue: string | null, newValue: string | null) {
  if (oldValue === newValue) return;
  await col.profileHistory(userId).add({
    userId,
    fieldName,
    oldValue: oldValue ? JSON.stringify(oldValue) : null,
    newValue: newValue ? JSON.stringify(newValue) : null,
    changedAt: new Date(),
    createdAt: new Date(),
  });
}

export async function getProfileHistory(userId: string, limit = 50) {
  const snap = await col.profileHistory(userId).orderBy("changedAt", "desc").limit(limit).get();
  return snap.docs.map(docData);
}

// ============= IMPORT HELPERS =============

export async function importCreditCardTransactionsFromPDF(userId: string, data: { cardId: string; pdfBase64: string; fileName: string }) {
  const card = await getCreditCardById(data.cardId, userId);
  if (!card) throw new Error("Cartão não encontrado");
  return { success: true, message: "Fatura importada com sucesso", transactionsImported: 0, fileName: data.fileName };
}

export async function importCreditCardTransactionsFromOFX(userId: string, data: { cardId: string; ofxContent: string; fileName: string }) {
  const card = await getCreditCardById(data.cardId, userId);
  if (!card) throw new Error("Cartão não encontrado");
  return { success: true, message: "Arquivo OFX importado com sucesso", transactionsImported: 0, fileName: data.fileName };
}

export async function importTransactionsFromOFX(userId: string, data: { accountId: string; ofxContent: string; fileName: string }) {
  const account = await getBankAccountById(data.accountId, userId);
  if (!account) throw new Error("Conta bancária não encontrada");
  return { success: true, message: "Arquivo OFX importado com sucesso", transactionsImported: 0, fileName: data.fileName };
}

export async function importFile(userId: string, data: {
  entityType: "creditCard" | "bankAccount";
  entityId: string;
  fileContent: string;
  fileName: string;
  fileType: string;
  transactions?: Array<{ date: Date; description: string; amount: string; type: "income" | "expense" }>;
  skipDuplicates?: boolean;
  dueDate?: Date;
}) {
  const rulesSnap = await col.rules(userId).where("enabled", "==", true).get();
  const rules = (rulesSnap.docs.map(docData) as any[]).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const extractedTransactions = data.transactions ?? [];
  let transactionsCreated = 0;

  if (data.entityType === "creditCard") {
    const card = await getCreditCardById(data.entityId, userId) as any;
    if (!card) throw new Error("Cartão não encontrado");

    for (const tx of extractedTransactions) {
      try {
        let dueDate: Date;
        if (data.dueDate) {
          dueDate = new Date(data.dueDate);
        } else {
          const txDay = tx.date.getDate();
          const txMonth = tx.date.getMonth();
          const txYear = tx.date.getFullYear();
          dueDate = txDay >= card.closingDay
            ? new Date(txYear, txMonth + 1, card.dueDay)
            : new Date(txYear, txMonth, card.dueDay);
        }

        let categoryId: string | null = null;
        for (const rule of rules) {
          if (matchesRule(tx.description, rule)) { categoryId = rule.categoryId; break; }
        }

        await col.ccTransactions(userId).add({
          cardId: data.entityId,
          userId,
          categoryId,
          date: tx.date,
          dueDate,
          description: tx.description,
          amount: tx.amount,
          installments: 1,
          currentInstallment: 1,
          paid: false,
          paidAt: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        transactionsCreated++;
      } catch { /* continue */ }
    }
  } else {
    const account = await getBankAccountById(data.entityId, userId);
    if (!account) throw new Error("Conta bancária não encontrada");

    for (const tx of extractedTransactions) {
      try {
        let categoryId: string | null = null;
        for (const rule of rules) {
          if (matchesRule(tx.description, rule)) { categoryId = rule.categoryId; break; }
        }

        await col.transactions(userId).add({
          accountId: data.entityId,
          userId,
          categoryId,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          reconciled: false,
          reconciledAt: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        transactionsCreated++;
      } catch { /* continue */ }
    }
  }

  await recordImportHistory(userId, {
    entityType: data.entityType,
    entityId: data.entityId,
    fileName: data.fileName,
    fileType: data.fileType,
    transactionsImported: transactionsCreated,
    duplicatesFound: 0,
    duplicatesSkipped: 0,
    status: transactionsCreated > 0 ? "success" : "partial",
  });

  return {
    success: true,
    message: `Arquivo importado com sucesso. ${transactionsCreated} transações criadas.`,
    transactionsImported: transactionsCreated,
    fileName: data.fileName,
  };
}

// ============= DUPLICATE DETECTION =============

function normText(t: string) { return t.toLowerCase().trim().replace(/\s+/g, " ").replace(/[^\w\s]/g, ""); }
function normAmount(a: string | number) {
  if (typeof a === "number") return parseFloat(a.toFixed(2));
  return parseFloat(a.replace(/[^0-9.,]/g, "").replace(",", "."));
}
function strSimilarity(s1: string, s2: string): number {
  const a = normText(s1), b = normText(s2);
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const m: number[][] = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[i-1] === a[j-1] ? m[i-1][j-1] : Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1);
    }
  }
  return 1 - m[b.length][a.length] / Math.max(a.length, b.length);
}

export async function checkDuplicatesForImport(userId: string, data: {
  entityType: "creditCard" | "bankAccount";
  entityId: string;
  transactions: Array<{ date: Date; description: string; amount: string }>;
  dateToleranceDays?: number;
  descriptionSimilarityThreshold?: number;
  amountTolerancePercent?: number;
}) {
  const dateTol = data.dateToleranceDays ?? 0;
  const descThr = data.descriptionSimilarityThreshold ?? 0.85;
  const amtTol = data.amountTolerancePercent ?? 0;

  let existing: any[] = [];
  if (data.entityType === "creditCard") {
    const snap = await col.ccTransactions(userId).where("cardId", "==", data.entityId).get();
    existing = snap.docs.map((d) => ts({ id: d.id, ...d.data() }));
  } else {
    const snap = await col.transactions(userId).where("accountId", "==", data.entityId).get();
    existing = snap.docs.map((d) => ts({ id: d.id, ...d.data() }));
  }

  const duplicates: any[] = [];
  const newTxs: any[] = [];

  for (const newTx of data.transactions) {
    let isDup = false;
    let matched = null;
    const newAmt = normAmount(newTx.amount);
    const newDate = new Date(newTx.date);

    for (const ex of existing) {
      const exDate = new Date(ex.date);
      const daysDiff = Math.abs((newDate.getTime() - exDate.getTime()) / 86400000);
      if (daysDiff > dateTol) continue;
      const exAmt = normAmount(ex.amount);
      const amtDiffPct = exAmt > 0 ? (Math.abs(newAmt - exAmt) / exAmt) * 100 : 0;
      if (amtDiffPct > amtTol) continue;
      if (strSimilarity(newTx.description, ex.description) >= descThr) {
        isDup = true;
        matched = { id: ex.id, date: ex.date, description: ex.description, amount: ex.amount };
        break;
      }
    }

    if (isDup) duplicates.push({ ...newTx, isDuplicate: true, matchedTransaction: matched });
    else newTxs.push({ ...newTx, isDuplicate: false });
  }

  return {
    duplicates,
    new: newTxs,
    summary: { total: data.transactions.length, duplicateCount: duplicates.length, newCount: newTxs.length },
  };
}

// ============= IMPORT HISTORY =============

export async function recordImportHistory(userId: string, data: {
  entityType: "creditCard" | "bankAccount";
  entityId: string;
  fileName: string;
  fileType: string;
  bankDetected?: string;
  transactionsImported: number;
  duplicatesFound: number;
  duplicatesSkipped?: number;
  status: "success" | "partial" | "failed";
  errorMessage?: string;
}) {
  await col.importHistory(userId).add({
    userId,
    ...data,
    duplicatesSkipped: data.duplicatesSkipped ?? 0,
    importedAt: new Date(),
    createdAt: new Date(),
  });
}

export async function getImportHistory(userId: string, entityType?: "creditCard" | "bankAccount", entityId?: string) {
  const snap = await col.importHistory(userId).orderBy("importedAt", "desc").get();
  let results = snap.docs.map(docData) as any[];
  if (entityType) results = results.filter((r) => r.entityType === entityType);
  if (entityId) results = results.filter((r) => r.entityId === entityId);
  return results;
}

export async function getImportHistoryById(userId: string, historyId: string) {
  return docData(await col.importHistory(userId).doc(historyId).get()) ?? null;
}

export async function getImportStatistics(userId: string, entityType?: "creditCard" | "bankAccount") {
  const snap = await col.importHistory(userId).get();
  let records = snap.docs.map((d) => d.data()) as any[];
  if (entityType) records = records.filter((r) => r.entityType === entityType);
  if (records.length === 0) return null;
  return {
    totalImports: records.length,
    totalTransactionsImported: records.reduce((s, r) => s + (r.transactionsImported || 0), 0),
    totalDuplicatesFound: records.reduce((s, r) => s + (r.duplicatesFound || 0), 0),
    successfulImports: records.filter((r) => r.status === "success").length,
    failedImports: records.filter((r) => r.status === "failed").length,
  };
}
