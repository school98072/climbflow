import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getLucia } from "../auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: {
    id: number;
    email: string | null;
    name: string | null;
    role: "user" | "admin";
  } | null;
  session: any;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const lucia = await getLucia();
  const cookieHeader = opts.req.headers.cookie || "";
  const sessionId = lucia.readSessionCookie(cookieHeader);

  if (!sessionId) {
    return {
      req: opts.req,
      res: opts.res,
      user: null,
      session: null,
    };
  }

  const { session, user } = await lucia.validateSession(sessionId);
  
  if (session && session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    opts.res.setHeader("Set-Cookie", sessionCookie.serialize());
  }
  
  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    opts.res.setHeader("Set-Cookie", sessionCookie.serialize());
  }

  return {
    req: opts.req,
    res: opts.res,
    user: (user as any),
    session,
  };
}
