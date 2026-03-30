// Execute ClimbFlow schema on Supabase via Management API
const SUPABASE_REF = "ckdvltgylsnkbltrubwm";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZHZsdGd5bHNua2JsdHJ1YndtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODM1OSwiZXhwIjoyMDkwNDQ0MzU5fQ.w_VZAmoEquE8KwQ4TTzBsVuFtoblGJ9Y0rCQaOIwxWM";
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;

// Use the Supabase Management API to run SQL
async function runSQL(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_REF}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const body = await res.text();
  return { status: res.status, body };
}

// Alternative: use the pg REST endpoint with service role
async function runSQLviaREST(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });
  const body = await res.text();
  return { status: res.status, body };
}

// Use supabase-js admin client approach
const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: "public" },
});

// Test connection
const { data: testData, error: testError } = await supabase
  .from("users")
  .select("count")
  .limit(1);
console.log("Table check:", testError?.message ?? "OK");

// The Management API endpoint
const mgmtRes = await runSQL("SELECT version()");
console.log("Management API test:", mgmtRes.status, mgmtRes.body.slice(0, 100));

// Schema SQL statements (split for individual execution)
const statements = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
  
  `CREATE TABLE IF NOT EXISTS users (
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
  
  `CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    avatar_url TEXT,
    climbing_level VARCHAR(50),
    favorite_grade_system VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  
  `CREATE TABLE IF NOT EXISTS routes (
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
  
  `CREATE TABLE IF NOT EXISTS videos (
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
  
  `CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    video_id INT REFERENCES videos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, route_id)
  )`,
  
  `CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_routes_grade ON routes(difficulty_grade, grade_system)`,
  `CREATE INDEX IF NOT EXISTS idx_routes_location ON routes(location_name)`,
  `CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_videos_route_id ON videos(route_id)`,
  `CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id)`,
  
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
   $$ LANGUAGE plpgsql`,
   
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
       CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
     END IF;
   END $$`,
   
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_routes_updated_at') THEN
       CREATE TRIGGER trg_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
     END IF;
   END $$`,
   
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_videos_updated_at') THEN
       CREATE TRIGGER trg_videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
     END IF;
   END $$`,
];

// Execute each statement via Management API
let successCount = 0;
let errorCount = 0;

for (const sql of statements) {
  const result = await runSQL(sql.trim());
  const preview = sql.trim().split('\n')[0].slice(0, 60);
  if (result.status === 200 || result.status === 201) {
    console.log(`✅ ${preview}`);
    successCount++;
  } else {
    console.log(`❌ ${preview}`);
    console.log(`   Error: ${result.body.slice(0, 150)}`);
    errorCount++;
  }
}

console.log(`\nDone: ${successCount} succeeded, ${errorCount} failed`);

// Create Storage buckets via Supabase Storage API
console.log("\n--- Creating Storage Buckets ---");
const bucketsToCreate = [
  { id: "videos", name: "videos", public: true, fileSizeLimit: 524288000 }, // 500MB
  { id: "thumbnails", name: "thumbnails", public: true, fileSizeLimit: 5242880 }, // 5MB
];

for (const bucket of bucketsToCreate) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(bucket),
  });
  const body = await res.json();
  if (res.status === 200 || res.status === 201 || body.message?.includes("already exists")) {
    console.log(`✅ Bucket '${bucket.id}' ready`);
  } else {
    console.log(`❌ Bucket '${bucket.id}': ${JSON.stringify(body)}`);
  }
}

// Verify tables were created
console.log("\n--- Verifying Tables ---");
const tables = ["users", "routes", "videos", "bookmarks", "user_profiles"];
for (const table of tables) {
  const { error } = await supabase.from(table).select("count").limit(1);
  console.log(`${error ? "❌" : "✅"} Table '${table}': ${error?.message ?? "OK"}`);
}
