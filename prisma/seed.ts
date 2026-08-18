import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(email: string, name: string, password: string) {
  const hashed = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, password: hashed },
  });
}

async function main() {
  await upsertUser(
    process.env.SEED_USER_1_EMAIL ?? "user1@bytebite.app",
    process.env.SEED_USER_1_NAME ?? "Usuario 1",
    process.env.SEED_USER_1_PASSWORD ?? "changeme1",
  );
  await upsertUser(
    process.env.SEED_USER_2_EMAIL ?? "user2@bytebite.app",
    process.env.SEED_USER_2_NAME ?? "Usuario 2",
    process.env.SEED_USER_2_PASSWORD ?? "changeme2",
  );
  console.log("Usuarios creados/actualizados correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
