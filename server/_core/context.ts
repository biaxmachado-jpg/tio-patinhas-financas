import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { adminAuth } from "../firebase";
import { upsertUser, type FirebaseUser } from "../firebase-db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: FirebaseUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: FirebaseUser | null = null;

  try {
    const authHeader = opts.req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const decoded = await adminAuth.verifyIdToken(token);
      user = await upsertUser({
        uid: decoded.uid,
        name: decoded.name ?? null,
        email: decoded.email ?? null,
        loginMethod: decoded.firebase?.sign_in_provider ?? null,
        lastSignedIn: new Date(),
      });
    }
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
