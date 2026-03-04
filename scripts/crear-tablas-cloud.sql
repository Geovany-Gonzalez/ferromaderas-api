-- ============================================================================
-- Crear tablas Ferromaderas - Para ejecutar en PostgreSQL en la nube
-- Schema: public | Tablas en español
-- ============================================================================

-- Roles
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- Permisos
CREATE TABLE "permisos" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- Categorías
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "padre_id" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- Rol-Permisos (relación)
CREATE TABLE "rol_permisos" (
    "rol_id" TEXT NOT NULL,
    "permiso_id" TEXT NOT NULL,

    CONSTRAINT "rol_permisos_pkey" PRIMARY KEY ("rol_id", "permiso_id")
);

-- Usuarios
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "profile_image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rol_id" TEXT NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- Productos
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "categoria_id" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- Índices únicos
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");
CREATE UNIQUE INDEX "permisos_slug_key" ON "permisos"("slug");
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- Claves foráneas
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_padre_id_fkey" FOREIGN KEY ("padre_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
