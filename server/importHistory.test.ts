import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Import History", () => {
  const userId = 1;
  const testCardId = 360002;

  describe("recordImportHistory", () => {
    it("should record a successful import", async () => {
      const result = await db.recordImportHistory(userId, {
        entityType: "creditCard",
        entityId: testCardId,
        fileName: "bradesco_fatura.xlsx",
        fileType: "application/vnd.ms-excel",
        bankDetected: "Bradesco",
        transactionsImported: 5,
        duplicatesFound: 2,
        duplicatesSkipped: 1,
        status: "success",
      });

      expect(result).toBeDefined();
      expect(result.insertId).toBeGreaterThan(0);
    });

    it("should record a failed import with error message", async () => {
      const result = await db.recordImportHistory(userId, {
        entityType: "creditCard",
        entityId: testCardId,
        fileName: "invalid_file.pdf",
        fileType: "application/pdf",
        transactionsImported: 0,
        duplicatesFound: 0,
        status: "failed",
        errorMessage: "PDF format not supported",
      });

      expect(result).toBeDefined();
      expect(result.insertId).toBeGreaterThan(0);
    });

    it("should record a partial import", async () => {
      const result = await db.recordImportHistory(userId, {
        entityType: "bankAccount",
        entityId: 1,
        fileName: "account_statement.ofx",
        fileType: "application/x-ofx",
        transactionsImported: 10,
        duplicatesFound: 5,
        duplicatesSkipped: 3,
        status: "partial",
        errorMessage: "Some transactions could not be imported",
      });

      expect(result).toBeDefined();
      expect(result.insertId).toBeGreaterThan(0);
    });
  });

  describe("getImportHistory", () => {
    it("should retrieve import history for a user", async () => {
      const history = await db.getImportHistory(userId);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it("should filter history by entity type", async () => {
      const creditCardHistory = await db.getImportHistory(userId, "creditCard");
      expect(Array.isArray(creditCardHistory)).toBe(true);
      
      const bankAccountHistory = await db.getImportHistory(userId, "bankAccount");
      expect(Array.isArray(bankAccountHistory)).toBe(true);
    });

    it("should filter history by entity ID", async () => {
      const history = await db.getImportHistory(userId, "creditCard", testCardId);
      expect(Array.isArray(history)).toBe(true);
      
      if (history.length > 0) {
        history.forEach((item: any) => {
          expect(item.entityId).toBe(testCardId);
        });
      }
    });

    it("should return history sorted by most recent first", async () => {
      const history = await db.getImportHistory(userId);
      if (history.length > 1) {
        for (let i = 0; i < history.length - 1; i++) {
          const current = new Date(history[i].importedAt).getTime();
          const next = new Date(history[i + 1].importedAt).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });
  });

  describe("getImportHistoryById", () => {
    it("should retrieve a specific import history record", async () => {
      const history = await db.getImportHistory(userId);
      if (history.length > 0) {
        const record = await db.getImportHistoryById(userId, history[0].id);
        expect(record).toBeDefined();
        expect(record?.id).toBe(history[0].id);
        expect(record?.userId).toBe(userId);
      }
    });

    it("should return null for non-existent record", async () => {
      const record = await db.getImportHistoryById(userId, 999999);
      expect(record).toBeNull();
    });

    it("should not return record from different user", async () => {
      const history = await db.getImportHistory(userId);
      if (history.length > 0) {
        const record = await db.getImportHistoryById(999, history[0].id);
        expect(record).toBeNull();
      }
    });
  });

  describe("getImportStatistics", () => {
    it("should retrieve import statistics for a user", async () => {
      const stats = await db.getImportStatistics(userId);
      expect(stats).toBeDefined();
      if (stats) {
        expect(Number(stats.totalImports)).toBeGreaterThanOrEqual(0);
        expect(Number(stats.totalTransactionsImported || 0)).toBeGreaterThanOrEqual(0);
        expect(Number(stats.totalDuplicatesFound || 0)).toBeGreaterThanOrEqual(0);
      }
    });

    it("should filter statistics by entity type", async () => {
      const creditCardStats = await db.getImportStatistics(userId, "creditCard");
      expect(creditCardStats).toBeDefined();
      
      const bankAccountStats = await db.getImportStatistics(userId, "bankAccount");
      expect(bankAccountStats).toBeDefined();
    });
  });
});
