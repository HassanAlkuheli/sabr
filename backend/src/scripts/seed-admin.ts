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

const ADMIN_EMAIL = "admin@sabr.local";
const ADMIN_PASSWORD = "admin123"; // change in production!
const ADMIN_NAME = "Sabr Admin";

async function seed() {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, ADMIN_EMAIL),
  });

  if (existing) {
    console.log(`✅ Admin already exists (${ADMIN_EMAIL})`);
    process.exit(0);
  }

  const hashedPassword = await Bun.password.hash(ADMIN_PASSWORD, {
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
  console.log(`   Default password: ${ADMIN_PASSWORD}`);
  console.log("   ⚠️  Change this password in production!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
