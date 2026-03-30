// Execute ClimbFlow schema on Supabase using Personal Access Token
import { createClient } from "@supabase/supabase-js";

const PAT = "sbp_f390f0914e5b1714f1f89ddad0ae2530c717cbb4";
const PROJECT_REF = "ckdvltgylsnkbltrubwm";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZHZsdGd5bHNua2JsdHJ1YndtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODM1OSwiZXhwIjoyMDkwNDQ0MzU5fQ.w_VZAmoEquE8KwQ4TTzBsVuFtoblGJ9Y0rCQaOIwxWM";

async function runSQL(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAT}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const body = await res.text();
  return { status: res.status, body };
}

// Test connection
console.log("=== Testing Management API Connection ===");
const test = await runSQL("SELECT current_database(), current_user, version()");
console.log(`Status: ${test.status}`);
console.log(`Response: ${test.body.slice(0, 200)}`);

if (test.status !== 200 && test.status !== 201) {
  console.error("❌ Cannot connect to Supabase Management API. Aborting.");
  process.exit(1);
}
console.log("✅ Connected!\n");

// Execute schema statements one by one
const statements = [
  {
    name: "Enable uuid-ossp extension",
    sql: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
  },
  {
    name: "Create users table",
    sql: `CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  open_id VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  login_method VARCHAR(64),
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
  },
  {
    name: "Create user_profiles table",
    sql: `CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  avatar_url TEXT,
  climbing_level VARCHAR(50),
  favorite_grade_system VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
  },
  {
    name: "Create routes table",
    sql: `CREATE TABLE IF NOT EXISTS routes (
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
)`,
  },
  {
    name: "Create videos table",
    sql: `CREATE TABLE IF NOT EXISTS videos (
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
)`,
  },
  {
    name: "Create bookmarks table",
    sql: `CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  video_id INT REFERENCES videos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, route_id)
)`,
  },
  {
    name: "Index: routes.user_id",
    sql: `CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id)`,
  },
  {
    name: "Index: routes grade",
    sql: `CREATE INDEX IF NOT EXISTS idx_routes_grade ON routes(difficulty_grade, grade_system)`,
  },
  {
    name: "Index: routes location",
    sql: `CREATE INDEX IF NOT EXISTS idx_routes_location ON routes(location_name)`,
  },
  {
    name: "Index: videos.user_id",
    sql: `CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id)`,
  },
  {
    name: "Index: videos.route_id",
    sql: `CREATE INDEX IF NOT EXISTS idx_videos_route_id ON videos(route_id)`,
  },
  {
    name: "Index: videos.created_at",
    sql: `CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC)`,
  },
  {
    name: "Index: bookmarks.user_id",
    sql: `CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id)`,
  },
  {
    name: "Create updated_at trigger function",
    sql: `CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql`,
  },
  {
    name: "Trigger: users updated_at",
    sql: `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
    CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$`,
  },
  {
    name: "Trigger: user_profiles updated_at",
    sql: `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_profiles_updated_at') THEN
    CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$`,
  },
  {
    name: "Trigger: routes updated_at",
    sql: `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_routes_updated_at') THEN
    CREATE TRIGGER trg_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$`,
  },
  {
    name: "Trigger: videos updated_at",
    sql: `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_videos_updated_at') THEN
    CREATE TRIGGER trg_videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$`,
  },
  {
    name: "Enable RLS on users",
    sql: `ALTER TABLE users ENABLE ROW LEVEL SECURITY`,
  },
  {
    name: "Enable RLS on routes",
    sql: `ALTER TABLE routes ENABLE ROW LEVEL SECURITY`,
  },
  {
    name: "Enable RLS on videos",
    sql: `ALTER TABLE videos ENABLE ROW LEVEL SECURITY`,
  },
  {
    name: "Enable RLS on bookmarks",
    sql: `ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY`,
  },
  {
    name: "RLS policy: public read routes",
    sql: `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='routes' AND policyname='routes_public_read') THEN
    CREATE POLICY routes_public_read ON routes FOR SELECT USING (true);
  END IF;
END $$`,
  },
  {
    name: "RLS policy: public read videos",
    sql: `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='videos' AND policyname='videos_public_read') THEN
    CREATE POLICY videos_public_read ON videos FOR SELECT USING (true);
  END IF;
END $$`,
  },
  {
    name: "RLS policy: service role full access (bypass RLS)",
    sql: `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='users_service_role') THEN
    CREATE POLICY users_service_role ON users USING (true) WITH CHECK (true);
  END IF;
END $$`,
  },
];

console.log("=== Executing Schema Statements ===\n");
let successCount = 0;
let errorCount = 0;

for (const stmt of statements) {
  const result = await runSQL(stmt.sql);
  if (result.status === 200 || result.status === 201) {
    console.log(`✅ ${stmt.name}`);
    successCount++;
  } else {
    // Check if it's an "already exists" error (acceptable)
    const body = result.body;
    if (body.includes("already exists") || body.includes("duplicate")) {
      console.log(`⚠️  ${stmt.name} (already exists, skipped)`);
      successCount++;
    } else {
      console.log(`❌ ${stmt.name}`);
      console.log(`   HTTP ${result.status}: ${body.slice(0, 200)}`);
      errorCount++;
    }
  }
}

console.log(`\n=== Schema Result: ${successCount} succeeded, ${errorCount} failed ===\n`);

// Verify tables via supabase-js
console.log("=== Verifying Tables via PostgREST ===");
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tables = ["users", "routes", "videos", "bookmarks", "user_profiles"];
for (const table of tables) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.log(`❌ Table '${table}': ${error.message}`);
  } else {
    console.log(`✅ Table '${table}': OK (${count ?? 0} rows)`);
  }
}

// Verify Storage buckets
console.log("\n=== Verifying Storage Buckets ===");
const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
if (bucketError) {
  console.log(`❌ Storage: ${bucketError.message}`);
} else {
  for (const b of buckets ?? []) {
    console.log(`✅ Bucket '${b.name}' (public: ${b.public})`);
  }
}

// Create Storage buckets if they don't exist
const existingBuckets = (buckets ?? []).map((b) => b.name);
for (const bucketConfig of [
  { id: "videos", name: "videos", public: true, fileSizeLimit: 524288000 },
  { id: "thumbnails", name: "thumbnails", public: true, fileSizeLimit: 5242880 },
]) {
  if (!existingBuckets.includes(bucketConfig.id)) {
    const { error } = await supabase.storage.createBucket(bucketConfig.id, {
      public: bucketConfig.public,
      fileSizeLimit: bucketConfig.fileSizeLimit,
    });
    if (error) {
      console.log(`❌ Create bucket '${bucketConfig.id}': ${error.message}`);
    } else {
      console.log(`✅ Created bucket '${bucketConfig.id}'`);
    }
  }
}

// Set Storage CORS policy to allow uploads from the app domain
console.log("\n=== Setting Storage CORS Policy ===");
const corsRes = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/storage`,
  {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PAT}`,
    },
    body: JSON.stringify({
      cors_rules: [
        {
          allowed_origins: [
            "https://climbflow-meaosjuz.manus.space",
            "http://localhost:3000",
            "https://localhost:3000",
            "*",
          ],
          allowed_methods: ["GET", "POST", "PUT", "DELETE", "HEAD"],
          allowed_headers: ["*"],
          expose_headers: ["Content-Length", "Content-Range"],
          max_age_seconds: 3600,
        },
      ],
    }),
  }
);
console.log(`CORS policy: HTTP ${corsRes.status} ${(await corsRes.text()).slice(0, 100)}`);

console.log("\n✅ Supabase setup complete!");
