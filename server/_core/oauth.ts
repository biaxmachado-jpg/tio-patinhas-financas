import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID || "bia-owner";
const OWNER_NAME = process.env.OWNER_NAME || "Bia";

async function ensureOwnerExists() {
  let user = await db.getUserByOpenId(OWNER_OPEN_ID);
  if (!user) {
    await db.upsertUser({
      openId: OWNER_OPEN_ID,
      name: OWNER_NAME,
      email: "bia.x.machado@gmail.com",
      loginMethod: "password",
      lastSignedIn: new Date(),
    });
    user = await db.getUserByOpenId(OWNER_OPEN_ID);
  }
  return user;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/login", (_req: Request, res: Response) => {
    const error = _req.query.error;
    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Tio Patinhas</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;font-family:system-ui,sans-serif}
    .card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px;width:100%;max-width:380px}
    .logo{display:flex;align-items:center;gap:10px;margin-bottom:32px;justify-content:center}
    .logo-icon{width:40px;height:40px;background:#6366f1;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}
    h1{color:#f1f5f9;font-size:20px;font-weight:700}
    label{display:block;color:#94a3b8;font-size:13px;margin-bottom:6px;margin-top:20px}
    input{width:100%;padding:10px 14px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#f1f5f9;font-size:15px;outline:none}
    input:focus{border-color:#6366f1}
    button{width:100%;margin-top:28px;padding:12px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
    button:hover{background:#4f46e5}
    .error{color:#f87171;font-size:13px;margin-top:12px;text-align:center}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">💰</div>
      <h1>Tio Patinhas</h1>
    </div>
    <form method="POST" action="/api/auth/login">
      <label>Senha</label>
      <input type="password" name="password" placeholder="••••••••" autofocus required/>
      <button type="submit">Entrar</button>
    </form>
    ${error ? '<p class="error">Senha incorreta</p>' : ''}
  </div>
</body>
</html>`);
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { password } = req.body;
    const correctPassword = process.env.APP_PASSWORD || "tiopatinhas2024";
    if (password !== correctPassword) {
      res.redirect("/login?error=1");
      return;
    }
    try {
      await ensureOwnerExists();
      const sessionToken = await sdk.createSessionToken(OWNER_OPEN_ID, {
        name: OWNER_NAME,
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect("/");
    } catch (err) {
      console.error("[Auth] Login failed", err);
      res.redirect("/login?error=1");
    }
  });

  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect("/login");
  });
}
