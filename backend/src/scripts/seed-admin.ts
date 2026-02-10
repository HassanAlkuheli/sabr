/**
 * Seed script — creates the default ADMIN account if it doesn't exist.
 *
 * Usage:
 *   bun run src/scripts/seed-admin.ts
 *
 * Environment variables are loaded from the root .env automatically.
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sabr.local";
// ADMIN_PASSWORD must be provided via environment variable. No default is allowed.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error("ERROR: ADMIN_PASSWORD must be set when running seed-admin.ts");
  process.exit(1);
}
const ADMIN_NAME = "Sabr Admin";

async function seed() {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, ADMIN_EMAIL),
  });

  if (existing) {
    console.log(`✅ Admin already exists (${ADMIN_EMAIL})`);
    process.exit(0);
  }

  const hashedPassword = await Bun.password.hash(ADMIN_PASSWORD as string, {
    algorithm: "bcrypt",
    cost: 10,
  });

  const [admin] = await db
    .insert(users)
    .values({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
    })
    .returning({ id: users.id, email: users.email });

  console.log(`🌱 Admin created: ${admin!.email} (id: ${admin!.id})`);
  // Do NOT print passwords to logs in production environments.
  console.log("   ⚠️  Admin user created. Ensure the ADMIN_PASSWORD value is kept secret and changed if necessary.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
