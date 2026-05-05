import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const perms = [
    { slug: 'manage_products', name: 'Gestionar productos' },
    { slug: 'manage_categories', name: 'Gestionar categorías' },
    { slug: 'manage_featured', name: 'Gestionar destacados' },
    { slug: 'view_quotes', name: 'Ver cotizaciones y cambiar estado' },
    { slug: 'view_bitacora', name: 'Ver bitácora de auditoría' },
    { slug: 'manage_users', name: 'Crear usuarios / Resetear contraseñas' },
    { slug: 'manage_policies', name: 'Gestionar políticas de compra' },
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
  const manageProducts = allPerms.find((p) => p.slug === 'manage_products')!;
  const manageCategories = allPerms.find((p) => p.slug === 'manage_categories')!;
  const manageFeatured = allPerms.find((p) => p.slug === 'manage_featured')!;
  const manageUsers = allPerms.find((p) => p.slug === 'manage_users')!;
  const managePolicies = allPerms.find((p) => p.slug === 'manage_policies')!;

  // Vendedor: solo ver cotizaciones y cambiar estado
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

  // Administrador: acceso a todo
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

  // Gerente: todo menos gestionar usuarios
  let gerente = await prisma.role.findUnique({ where: { slug: 'gerente' } });
  if (!gerente) {
    gerente = await prisma.role.create({
      data: { slug: 'gerente', name: 'Gerente' },
    });
  }
  await prisma.rolePermission.deleteMany({ where: { roleId: gerente.id } });
  for (const p of allPerms) {
    if (p.slug !== 'manage_users') {
      await prisma.rolePermission.create({
        data: { roleId: gerente.id, permissionId: p.id },
      });
    }
  }

  // Editor: contenido público (políticas, destacados) y cotizaciones
  let editor = await prisma.role.findUnique({ where: { slug: 'editor' } });
  if (!editor) {
    editor = await prisma.role.create({
      data: { slug: 'editor', name: 'Editor' },
    });
  }
  await prisma.rolePermission.deleteMany({ where: { roleId: editor.id } });
  await prisma.rolePermission.createMany({
    data: [
      { roleId: editor.id, permissionId: viewQuotes.id },
      { roleId: editor.id, permissionId: manageFeatured.id },
      { roleId: editor.id, permissionId: managePolicies.id },
    ],
  });

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    create: {
      email: 'admin@ferromaderas.com',
      username: 'admin',
      passwordHash,
      name: 'Administrador',
      status: 'activo',
      roleId: admin.id,
    },
    update: { email: 'admin@ferromaderas.com', passwordHash, roleId: admin.id },
  });

  // Políticas de compra: crear página por defecto si no existe
  let policyPage = await prisma.policyPage.findFirst();
  if (!policyPage) {
    policyPage = await prisma.policyPage.create({
      data: {
        title: 'Políticas de compra',
        subtitle: 'Leé estas condiciones antes de confirmar tu pedido por WhatsApp.',
      },
    });
    const sections = [
      { title: 'Precios y vigencia', icon: '/assets/icons/placeholder-price.png', content: ['Los precios pueden variar sin previo aviso.', 'La cotización se confirma al finalizar por WhatsApp.'] },
      { title: 'Envío y flete', icon: '/assets/icons/placeholder-delivery.png', content: ['El flete depende de zona/distancia/productos.', 'Se confirma antes de cerrar el pedido.'] },
      { title: 'Cambios y devoluciones', icon: '/assets/icons/placeholder-returns.png', content: ['No se aceptan cambios ni devoluciones tras la entrega.', 'Aplica revisión al recibir.'] },
      { title: 'Disponibilidad', icon: '/assets/icons/placeholder-stock.png', content: ['Productos sujetos a stock.', 'Si se agota el producto, el vendedor por vía Whatsapp te ofrecerá la mejor alternativa.'] },
      { title: 'Métodos de pago', icon: '/assets/icons/placeholder-payment.png', content: ['Los métodos de pago son únicamente los siguientes:', 'Efectivo.', 'Transferencia'] },
      { title: 'Horarios', icon: '/assets/icons/placeholder-schedule.png', content: ['Lunes a sábado 7:30 am – 5:30 pm.', 'Fuera de horario se atiende el siguiente día hábil.'] },
    ];
    for (let i = 0; i < sections.length; i++) {
      await prisma.policySection.create({
        data: {
          pageId: policyPage.id,
          title: sections[i].title,
          iconUrl: sections[i].icon,
          content: sections[i].content,
          order: i,
        },
      });
    }
    console.log('Políticas de compra creadas.');
  }

  console.log('Seed completado: roles, permisos, usuario admin y políticas.');
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
