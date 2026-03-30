// Execute ClimbFlow schema on Supabase
// Using supabase-js client with service role key
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ckdvltgylsnkbltrubwm.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZHZsdGd5bHNua2JsdHJ1YndtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODM1OSwiZXhwIjoyMDkwNDQ0MzU5fQ.w_VZAmoEquE8KwQ4TTzBsVuFtoblGJ9Y0rCQaOIwxWM";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Full schema as a single SQL block
const FULL_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  open_id VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  login_method VARCHAR(64),
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  avatar_url TEXT,
  climbing_level VARCHAR(50),
  favorite_grade_system VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  difficulty_grade VARCHAR(10) NOT NULL,
  grade_system VARCHAR(10) NOT NULL,
  tags JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INT,
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  video_id INT REFERENCES videos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, route_id)
);

CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_grade ON routes(difficulty_grade, grade_system);
CREATE INDEX IF NOT EXISTS idx_routes_location ON routes(location_name);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_route_id ON videos(route_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
\$\$ LANGUAGE plpgsql;
`;

// Try using the Supabase SQL endpoint directly
// Supabase exposes a /rest/v1/ endpoint but for raw SQL we need the pg endpoint
// The correct approach is to use the REST API with the service role

// Method: Use fetch with the correct Supabase SQL endpoint
async function executeSQL(sql) {
  // Supabase has a special endpoint for running SQL via the service role
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ query: sql }),
  });
  return { status: response.status, body: await response.text() };
}

// The correct way: use Supabase's pg connection via the REST API
// We'll use the supabase-js client's from().select() to test, 
// and for schema creation we use the direct PostgreSQL connection

// Try the correct endpoint format
const res = await fetch(`${SUPABASE_URL}/pg/query`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  },
  body: JSON.stringify({ query: "SELECT current_database(), current_user" }),
});
console.log("PG endpoint:", res.status, (await res.text()).slice(0, 100));

// Try the correct Supabase SQL API
const res2 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
});
const swagger = await res2.json();
console.log("Available paths:", Object.keys(swagger?.paths ?? {}).slice(0, 10));
