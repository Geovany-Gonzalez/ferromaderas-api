import { PrismaClient, Product } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const DEMO_MARKER = '[demo-agente]';
const DEMO_IMAGE = '/assets/icons/logo.png';

interface DemoCategoria {
  slug: string;
  name: string;
}

interface DemoProducto {
  code: string;
  name: string;
  categorySlug: string;
  price: number;
  featured?: boolean;
  stock?: number;
}

const DEMO_CATEGORIAS: DemoCategoria[] = [
  { slug: 'demo-cemento', name: 'Cemento y mortero' },
  { slug: 'demo-hierro', name: 'Hierro y varilla' },
  { slug: 'demo-pintura', name: 'Pintura y acabados' },
  { slug: 'demo-madera', name: 'Madera y tableros' },
];

const DEMO_PRODUCTOS: DemoProducto[] = [
  { code: 'DEMO-1001', name: 'Cemento Holcim 50 kg', categorySlug: 'demo-cemento', price: 85, featured: true, stock: 120 },
  { code: 'DEMO-1002', name: 'Mortero preparado 25 kg', categorySlug: 'demo-cemento', price: 45, stock: 80 },
  { code: 'DEMO-1003', name: 'Varilla corrugada 3/8 x 6 m', categorySlug: 'demo-hierro', price: 32, featured: true, stock: 200 },
  { code: 'DEMO-1004', name: 'Alambre recocido #18', categorySlug: 'demo-hierro', price: 18, stock: 150 },
  { code: 'DEMO-1005', name: 'Pintura látex blanco galón', categorySlug: 'demo-pintura', price: 95, featured: true, stock: 60 },
  { code: 'DEMO-1006', name: 'Brocha 4 pulgadas', categorySlug: 'demo-pintura', price: 12, stock: 90 },
  { code: 'DEMO-1007', name: 'Rodillo con bandeja', categorySlug: 'demo-pintura', price: 28, stock: 45 },
  { code: 'DEMO-1008', name: 'Tabla pino 1x8 x 8 pies', categorySlug: 'demo-madera', price: 55, stock: 70 },
  { code: 'DEMO-1009', name: 'Triplay 9 mm 4x8', categorySlug: 'demo-madera', price: 180, featured: true, stock: 35 },
  { code: 'DEMO-1010', name: 'Clavos 2 pulgadas libra', categorySlug: 'demo-madera', price: 8, stock: 200 },
  { code: 'DEMO-1011', name: 'Arena fina m³', categorySlug: 'demo-cemento', price: 120, stock: 40 },
  { code: 'DEMO-1012', name: 'Malla electrosoldada 6x6', categorySlug: 'demo-hierro', price: 75, stock: 55 },
];

interface DemoCliente {
  nombre: string;
  telefono: string;
  email: string;
}

const DEMO_CLIENTES: DemoCliente[] = [
  { nombre: 'Juan Pérez', telefono: '50212345601', email: 'demo.cliente1@example.com' },
  { nombre: 'María López', telefono: '50212345602', email: 'demo.cliente2@example.com' },
  { nombre: 'Carlos Ruiz', telefono: '50212345603', email: 'demo.cliente3@example.com' },
  { nombre: 'Ana Morales', telefono: '50212345604', email: 'demo.cliente4@example.com' },
  { nombre: 'Pedro Castillo', telefono: '50212345605', email: 'demo.cliente5@example.com' },
];

const DEMO_ESTADOS = [
  'nueva',
  'en_seguimiento',
  'confirmada',
  'cerrada',
  'cancelada',
] as const;

function buildBaskets(products: Product[]): Product[][] {
  const baskets: Product[][] = [];
  const n = products.length;

  for (let i = 0; i < n - 1; i += 2) {
    baskets.push([products[i], products[i + 1]]);
  }

  if (n >= 6) {
    baskets.push([products[0], products[2], products[4]]);
    baskets.push([products[1], products[3], products[5]]);
    baskets.push([products[0], products[1], products[3]]);
  }

  if (n >= 8) {
    baskets.push([products[2], products[3], products[6], products[7]]);
  }

  return baskets.filter((b) => b.length >= 2);
}

function repeatBaskets(baskets: Product[][], repeats: number): Product[][] {
  const out: Product[][] = [];
  for (let r = 0; r < repeats; r++) {
    for (const basket of baskets) {
      out.push(basket);
    }
  }
  return out;
}

/** Crea categorías y productos demo si el catálogo activo es insuficiente. */
async function ensureDemoCatalog(prisma: PrismaClient): Promise<void> {
  const activeCount = await prisma.product.count({ where: { active: true } });
  if (activeCount >= 6) return;

  const categoryIds = new Map<string, string>();
  for (const cat of DEMO_CATEGORIAS) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { name: cat.name, slug: cat.slug, active: true },
      update: { name: cat.name, active: true },
    });
    categoryIds.set(cat.slug, row.id);
  }

  for (const p of DEMO_PRODUCTOS) {
    const categoryId = categoryIds.get(p.categorySlug);
    if (!categoryId) continue;
    await prisma.product.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        name: p.name,
        price: new Decimal(p.price),
        imageUrl: DEMO_IMAGE,
        categoryId,
        active: true,
        featured: p.featured ?? false,
        pendingConfig: false,
        stock: p.stock ?? 10,
      },
      update: {
        name: p.name,
        price: new Decimal(p.price),
        imageUrl: DEMO_IMAGE,
        categoryId,
        active: true,
        featured: p.featured ?? false,
        pendingConfig: false,
        stock: p.stock ?? 10,
      },
    });
  }

  console.log(`Demo catálogo: asegurados ${DEMO_PRODUCTOS.length} productos de demostración.`);
}

/**
 * Crea cotizaciones sintéticas con patrones de venta cruzada para alimentar
 * el agente de recomendaciones (co-ocurrencia en cotizacion_items).
 * Idempotente: no duplica si ya existen registros marcados con DEMO_MARKER.
 */
export async function seedDemoCotizaciones(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.cotizacion.count({
    where: { clienteNota: { contains: DEMO_MARKER } },
  });
  if (existing > 0) {
    console.log(`Demo cotizaciones: ya hay ${existing} registro(s), se omite.`);
    return;
  }

  await ensureDemoCatalog(prisma);

  const products = await prisma.product.findMany({
    where: { active: true, price: { gt: 0 } },
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    take: 30,
  });

  if (products.length < 6) {
    console.log(
      `Demo cotizaciones: catálogo insuficiente (${products.length} productos activos; se requieren al menos 6).`,
    );
    return;
  }

  const vendedor = await prisma.user.findUnique({
    where: { username: 'vendedor1' },
    select: { id: true, name: true },
  });

  const baseBaskets = buildBaskets(products);
  const scheduledBaskets = repeatBaskets(baseBaskets.slice(0, Math.min(4, baseBaskets.length)), 4);

  let created = 0;
  const year = new Date().getFullYear();

  for (let i = 0; i < scheduledBaskets.length; i++) {
    const basket = scheduledBaskets[i];
    const cliente = DEMO_CLIENTES[i % DEMO_CLIENTES.length];
    const estado = DEMO_ESTADOS[i % DEMO_ESTADOS.length];
    const codigo = `FM-${year}-D${String(i + 1).padStart(3, '0')}`;

    const itemsData = basket.map((p, idx) => {
      const cantidad = 1 + ((i + idx) % 3);
      const precio = new Decimal(p.price);
      const subtotal = precio.mul(cantidad);
      return {
        productoId: p.id,
        codigo: p.code,
        nombre: p.name,
        precioUnitario: precio,
        cantidad,
        subtotal,
      };
    });

    const subtotal = itemsData.reduce(
      (sum, it) => sum.add(it.subtotal),
      new Decimal(0),
    );

    const assignVendedor = estado !== 'nueva' && vendedor;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - (scheduledBaskets.length - i));

    await prisma.cotizacion.create({
      data: {
        codigo,
        estado,
        clienteNombre: cliente.nombre,
        clienteTelefono: cliente.telefono,
        clienteEmail: cliente.email,
        clienteNota: `${DEMO_MARKER} Datos de demostración para el agente de recomendaciones.`,
        subtotal,
        descuentoPorcentaje: new Decimal(0),
        descuentoMonto: new Decimal(0),
        total: subtotal,
        aprobacion: 'no_requiere',
        vendedorId: assignVendedor ? vendedor!.id : null,
        vendedorNombre: assignVendedor ? vendedor!.name : null,
        createdAt,
        items: { create: itemsData },
        seguimiento: {
          create: {
            tipo: 'creacion',
            estadoNuevo: 'nueva',
            comentario: 'Cotización demo generada por seed.',
            usuarioNombre: 'Sistema',
          },
        },
      },
    });

    created++;
  }

  console.log(
    `Demo cotizaciones: creadas ${created} cotización(es) con ${products.length} productos del catálogo.`,
  );
}
