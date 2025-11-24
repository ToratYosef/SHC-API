import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_zyuokg5L6ACf@ep-cool-violet-a4ea6weg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require",
  },
} satisfies Config;
