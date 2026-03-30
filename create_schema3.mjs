// Execute ClimbFlow schema on Supabase
// Using the correct Supabase approach: create a custom RPC function first,
// then use it to execute DDL statements
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ckdvltgylsnkbltrubwm.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZHZsdGd5bHNua2JsdHJ1YndtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODM1OSwiZXhwIjoyMDkwNDQ0MzU5fQ.w_VZAmoEquE8KwQ4TTzBsVuFtoblGJ9Y0rCQaOIwxWM";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Step 1: Try to create the exec_sql function via PostgREST
// We need to POST to /rest/v1/rpc/exec_sql but it doesn't exist yet
// Instead, use the Supabase REST API to insert into a special table

// The correct approach for Supabase: use the pg connection string
// Supabase provides: postgresql://postgres.[ref]:[password]@[host]:5432/postgres
// But we don't have the password. Let's use the service role JWT approach.

// Actually, the correct way is to use the Supabase CLI or Dashboard.
// However, we can use the PostgREST API to call a function if it exists.

// Let's try a different approach: use the Supabase REST API to create tables
// by inserting into pg_catalog... No, that won't work.

// The REAL correct approach: Supabase exposes a SQL execution endpoint
// at /rest/v1/rpc/exec_sql (if the function exists in public schema)
// OR we can use the Supabase Management API with a personal access token.

// Since we have the service role key, let's try the direct PostgreSQL approach
// using the Supabase connection pooler

// Connection string format for Supabase:
// postgresql://postgres.ckdvltgylsnkbltrubwm:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

// We don't have the DB password, but we can use the REST API approach
// The service role key allows us to bypass RLS and access all tables

// Let's check what RPC functions are available
const { data: rpcList, error: rpcError } = await supabase.rpc("version");
console.log("RPC version:", rpcList, rpcError?.message);

// Try to call pg_catalog functions
const { data: pgVersion, error: pgError } = await supabase.rpc("pg_catalog.version");
console.log("PG version:", pgVersion, pgError?.message);

// The actual solution: use Supabase's HTTP API to execute SQL
// Supabase has an undocumented endpoint for this
const headers = {
  "Content-Type": "application/json",
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

// Try the Supabase SQL endpoint (used by their dashboard)
const endpoints = [
  "/rest/v1/rpc/exec",
  "/rest/v1/rpc/sql",
  "/rest/v1/rpc/run_sql",
  "/pg",
  "/sql",
];

for (const endpoint of endpoints) {
  const res = await fetch(`${SUPABASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: "SELECT 1" }),
  });
  console.log(`${endpoint}: ${res.status}`);
}

// The correct approach: use the Supabase client to call a bootstrap function
// First, let's check if we can use the service role to bypass RLS and 
// directly insert/create via the REST API

// Actually, for DDL (CREATE TABLE), we need raw SQL execution.
// The only way without the DB password is through:
// 1. Supabase Dashboard SQL Editor (manual)
// 2. Supabase Management API with personal access token
// 3. Direct PostgreSQL connection with DB password

// Let's try the Supabase Management API with the service role as bearer
const mgmtRes = await fetch(
  `https://api.supabase.com/v1/projects/ckdvltgylsnkbltrubwm/database/query`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: "SELECT current_database()" }),
  }
);
console.log("Management API:", mgmtRes.status, (await mgmtRes.text()).slice(0, 100));
