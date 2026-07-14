import { PrismaClient } from '@prisma/client';
import { seedDemoCotizaciones } from '../prisma/seed-demo-cotizaciones';

const prisma = new PrismaClient();

seedDemoCotizaciones(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
