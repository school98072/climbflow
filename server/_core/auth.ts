import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

const supabase = createClient(ENV.supabaseUrl || "http://localhost", ENV.supabaseAnonKey || "fake");

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/callback", async (req: Request, res: Response) => {
    const { access_token } = req.body;

    if (!access_token) {
      res.status(400).json({ error: "access_token is required" });
      return;
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser(access_token);

      if (error || !user) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      await db.upsertUser({
        openId: user.id,
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || null,
        email: user.email ?? null,
        loginMethod: user.app_metadata?.provider || "email",
        lastSignedIn: new Date(),
      });

      const cookieOptions = getSessionCookieOptions(req);
      // We store the access token in the cookie so the server can verify it later
      res.cookie(COOKIE_NAME, access_token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[Auth] Callback failed", error);
      res.status(500).json({ error: "Auth callback failed" });
    }
  });
}
