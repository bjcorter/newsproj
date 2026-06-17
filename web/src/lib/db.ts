import path from "path";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../../generated/prisma/client";

// Monorepo: load root .env when Next.js hasn't yet (e.g. Turbopack module init order)
config({ path: path.resolve(__dirname, "../../../.env") });

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to /workspace/.env or web/.env.local"
    );
  }
  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  pool: Pool;
};

const pool =
  globalForPrisma.pool ??
  new Pool({ connectionString: getConnectionString() });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}