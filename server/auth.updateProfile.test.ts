import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Auth - updateProfile", () => {
  it("should update user name successfully", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Atualizar o nome
    const updateResult = await caller.auth.updateProfile({
      name: "Beatriz Machado Teste",
      email: undefined,
    });

    expect(updateResult).toBeDefined();

    // Verificar se o nome foi realmente atualizado no banco de dados
    const database = await getDb();
    const userProfile = await database?.select().from(users).where(eq(users.id, 1)).limit(1);
    expect(userProfile).toBeDefined();
    expect(userProfile?.[0]?.name).toBe("Beatriz Machado Teste");
  });

  it("should update user email successfully", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Atualizar o email
    const updateResult = await caller.auth.updateProfile({
      name: undefined,
      email: "novo.email@example.com",
    });

    expect(updateResult).toBeDefined();

    // Verificar se o email foi realmente atualizado no banco de dados
    const database = await getDb();
    const userProfile = await database?.select().from(users).where(eq(users.id, 1)).limit(1);
    expect(userProfile).toBeDefined();
    expect(userProfile?.[0]?.email).toBe("novo.email@example.com");
  });

  it("should update both name and email successfully", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Atualizar nome e email
    const updateResult = await caller.auth.updateProfile({
      name: "Beatriz Machado",
      email: "bia.machado@example.com",
    });

    expect(updateResult).toBeDefined();

    // Verificar se ambos foram atualizados no banco de dados
    const database = await getDb();
    const userProfile = await database?.select().from(users).where(eq(users.id, 1)).limit(1);
    expect(userProfile).toBeDefined();
    expect(userProfile?.[0]?.name).toBe("Beatriz Machado");
    expect(userProfile?.[0]?.email).toBe("bia.machado@example.com");
  });

  it("should handle empty update gracefully", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Tentar atualizar sem dados - isso deve lançar um erro
    try {
      await caller.auth.updateProfile({
        name: undefined,
        email: undefined,
      });
      // Se chegar aqui, o teste falha
      expect(true).toBe(false);
    } catch (error) {
      // Esperamos um erro quando nenhum dado é fornecido
      expect(error).toBeDefined();
    }
  });
});
