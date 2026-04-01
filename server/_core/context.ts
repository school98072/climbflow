import { COOKIE_NAME } from "@shared/const";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookie } from "cookie";
import { jwtVerify } from "jose";
import { ENV } from "./env";
import { getUserById } from "../db";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const cookieHeader = opts.req.headers.cookie || "";
  const cookies = parseCookie(cookieHeader);
  const sessionToken = cookies[COOKIE_NAME];

  let user: User | null = null;

  if (sessionToken) {
    try {
      const secret = new TextEncoder().encode(ENV.cookieSecret);
      const { payload } = await jwtVerify(sessionToken, secret);
      const userId = payload.userId as number;
      
      if (userId) {
        user = await getUserById(userId) || null;
      }
    } catch (error) {
      // Token is invalid or expired
      console.warn("[Auth] Invalid session token");
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
