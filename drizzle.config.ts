import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./src/c2/database/schema.ts",
  out: "./src/c2/database",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
