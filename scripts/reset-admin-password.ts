/**
 * Resetea la contraseña del usuario admin usando bcrypt de Node.
 * npm run reset-admin-password
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en .env');
    process.exit(1);
  }
  const hash = await bcrypt.hash('Admin123!', 10);
  const updated = await prisma.user.updateMany({
    where: { username: 'admin' },
    data: { passwordHash: hash },
  });
  console.log(
    updated.count > 0
      ? 'Contraseña de admin actualizada. Login: admin / Admin123!'
      : 'Usuario admin no encontrado.'
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
