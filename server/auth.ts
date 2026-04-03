import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { getDb } from "./db";
import { sessions, users } from "../drizzle/schema";

let _lucia: Lucia | null = null;

export async function getLucia() {
  if (!_lucia) {
    const db = await getDb();
    const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

    _lucia = new Lucia(adapter, {
      sessionCookie: {
        attributes: {
          // Development (HTTP): secure: false
          // Production (HTTPS): secure: true
          // If using HTTPS in local dev, this can be overridden by environment variable
          secure: process.env.NODE_ENV === "production" || process.env.SECURE_COOKIE === "true"
        }
      },
      getUserAttributes: (attributes: any) => {
        return {
          email: attributes.email,
          name: attributes.name,
          role: attributes.role,
        };
      }
    });
  }
  return _lucia;
}

declare module "lucia" {
  interface Register {
    Lucia: Lucia;
    DatabaseUserAttributes: {
      email: string | null;
      name: string | null;
      role: string;
    };
  }
}
