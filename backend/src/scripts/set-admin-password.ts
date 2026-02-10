import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

async function setPassword() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sabr.local";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    console.error("ERROR: ADMIN_PASSWORD must be set in environment");
    process.exit(1);
  }

  const hashedPassword = await Bun.password.hash(ADMIN_PASSWORD, {
    algorithm: "bcrypt",
    cost: 10,
  });

  const existing = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) });

  if (existing) {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, existing.id));
    console.log(`✅ Updated password for existing admin: ${ADMIN_EMAIL}`);
  } else {
    const [admin] = await db
      .insert(users)
      .values({ name: "Sabr Admin", email: ADMIN_EMAIL, password: hashedPassword, role: "ADMIN", status: "ACTIVE" })
      .returning({ id: users.id, email: users.email });
    console.log(`🌱 Admin created: ${admin!.email} (id: ${admin!.id})`);
  }
  process.exit(0);
}

setPassword().catch((err) => {
  console.error("❌ Failed to set admin password:", err);
  process.exit(1);
});