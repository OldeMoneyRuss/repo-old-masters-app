/**
 * One-off: create an initial super_admin user from env vars.
 * Run with:
 *   SEED_ADMIN_EMAIL=russ@oldemoney.com SEED_ADMIN_PASSWORD='...' npm run db:seed-admin
 */
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { users } from "@/db/schema";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD required");
  }
  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  const [row] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name,
      role: "super_admin",
      emailVerifiedAt: now,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { role: "super_admin", emailVerifiedAt: now },
    })
    .returning({ id: users.id, email: users.email, role: users.role });

  console.log("Seeded admin:", row);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
