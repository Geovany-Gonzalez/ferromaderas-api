import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const perms = [
    { slug: 'manage_products', name: 'Gestionar productos' },
    { slug: 'manage_categories', name: 'Gestionar categorías' },
    { slug: 'manage_featured', name: 'Gestionar destacados' },
    { slug: 'view_quotes', name: 'Ver cotizaciones y cambiar estado' },
    { slug: 'manage_users', name: 'Crear usuarios / Resetear contraseñas' },
  ];

  for (const p of perms) {
    await prisma.permission.upsert({
      where: { slug: p.slug },
      create: p,
      update: { name: p.name },
    });
  }

  const allPerms = await prisma.permission.findMany();
  const viewQuotes = allPerms.find((p) => p.slug === 'view_quotes')!;

  let vendedor = await prisma.role.findUnique({ where: { slug: 'vendedor' } });
  if (!vendedor) {
    vendedor = await prisma.role.create({
      data: { slug: 'vendedor', name: 'Vendedor' },
    });
  }
  await prisma.rolePermission.deleteMany({ where: { roleId: vendedor.id } });
  await prisma.rolePermission.create({
    data: { roleId: vendedor.id, permissionId: viewQuotes.id },
  });

  let admin = await prisma.role.findUnique({ where: { slug: 'administrador' } });
  if (!admin) {
    admin = await prisma.role.create({
      data: { slug: 'administrador', name: 'Administrador' },
    });
  }
  await prisma.rolePermission.deleteMany({ where: { roleId: admin.id } });
  for (const p of allPerms) {
    await prisma.rolePermission.create({
      data: { roleId: admin.id, permissionId: p.id },
    });
  }

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@ferromaderas.com' },
    create: {
      email: 'admin@ferromaderas.com',
      username: 'admin',
      passwordHash,
      name: 'Administrador',
      status: 'activo',
      roleId: admin.id,
    },
    update: {},
  });

  console.log('Seed completado: roles, permisos y usuario admin.');
  console.log('Login: admin@ferromaderas.com / Admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
