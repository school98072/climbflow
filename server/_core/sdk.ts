import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

const supabase = createClient(ENV.supabaseUrl || "http://localhost", ENV.supabaseAnonKey || "fake");

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);

    if (!sessionCookie) {
      throw ForbiddenError("Invalid session cookie");
    }

    const { data: { user: authUser }, error } = await supabase.auth.getUser(sessionCookie);

    if (error || !authUser) {
       throw ForbiddenError("Invalid session cookie");
    }

    const sessionUserId = authUser.id;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    if (!user) {
        await db.upsertUser({
          openId: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || null,
          email: authUser.email ?? null,
          loginMethod: authUser.app_metadata?.provider || "email",
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(authUser.id);
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const sdk = new SDKServer();
