/**
 * Prueba la conexión a la base de datos.
 * Ejecutar: node scripts/test-connection.js
 * Ajusta DATABASE_URL en .env con la contraseña correcta de postgres.
 */
const path = require('path');
const root = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });
require('dotenv').config({ path: path.join(root, '.env.local'), override: true });

const url = process.env.DATABASE_URL || '';
console.log('Conectando a:', url.replace(/:[^:@]+@/, ':****@'));

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos');
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    console.log('✅ Query de prueba:', result);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
