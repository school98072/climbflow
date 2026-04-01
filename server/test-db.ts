import "dotenv/config";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
console.log("🔗 Connecting to:", connectionString?.split("@")[1]); // Log host only for safety

const sql = postgres(connectionString!, { ssl: 'require', connect_timeout: 10 });

async function test() {
  try {
    console.log("⏳ Sending test query...");
    const result = await sql`SELECT 1 as connected`;
    console.log("✅ Connection successful:", result);
    process.exit(0);
  } catch (error) {
    console.error("❌ Connection failed:", error);
    process.exit(1);
  }
}

test();
