import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

describe("Supabase credentials", () => {
  it("should have SUPABASE_URL set", () => {
    expect(SUPABASE_URL).toBeTruthy();
    expect(SUPABASE_URL).toContain("supabase.co");
  });

  it("should have SUPABASE_SERVICE_ROLE_KEY set", () => {
    expect(SUPABASE_SERVICE_KEY).toBeTruthy();
    expect(SUPABASE_SERVICE_KEY.length).toBeGreaterThan(50);
  });

  it("should connect to Supabase and list tables", async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });
    expect(error).toBeNull();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should be able to list storage buckets", async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: buckets, error } = await supabase.storage.listBuckets();
    expect(error).toBeNull();
    const bucketNames = (buckets ?? []).map((b) => b.name);
    expect(bucketNames).toContain("videos");
  });
});
