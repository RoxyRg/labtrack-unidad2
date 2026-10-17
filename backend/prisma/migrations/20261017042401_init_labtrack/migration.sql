-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'SOLICITANTE');

-- CreateEnum
CREATE TYPE "EstadoEquipo" AS ENUM ('DISPONIBLE', 'RESERVADO', 'PRESTADO', 'MANTENIMIENTO');

-- CreateEnum
CREATE TYPE "EstadoPrestamo" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO', 'ENTREGADO', 'DEVUELTO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "matricula" VARCHAR(30),
    "correo" VARCHAR(160) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'SOLICITANTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id" SERIAL NOT NULL,
    "codigo_inventario" VARCHAR(80) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "marca" VARCHAR(100) NOT NULL,
    "modelo" VARCHAR(100) NOT NULL,
    "numero_serie" VARCHAR(120),
    "categoria_id" INTEGER NOT NULL,
    "estado" "EstadoEquipo" NOT NULL DEFAULT 'DISPONIBLE',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestamos" (
    "id" SERIAL NOT NULL,
    "solicitante_id" INTEGER NOT NULL,
    "atendido_por_id" INTEGER,
    "fecha_salida" DATE NOT NULL,
    "fecha_devolucion" DATE NOT NULL,
    "estado" "EstadoPrestamo" NOT NULL DEFAULT 'PENDIENTE',
    "motivo" TEXT NOT NULL,
    "entregado_en" TIMESTAMP(3),
    "devuelto_en" TIMESTAMP(3),

    CONSTRAINT "prestamos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_prestamo" (
    "id" SERIAL NOT NULL,
    "prestamo_id" INTEGER NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "detalle_prestamo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_matricula_key" ON "usuarios"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_codigo_inventario_key" ON "equipos"("codigo_inventario");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_numero_serie_key" ON "equipos"("numero_serie");

-- CreateIndex
CREATE INDEX "equipos_categoria_id_estado_idx" ON "equipos"("categoria_id", "estado");

-- CreateIndex
CREATE INDEX "prestamos_solicitante_id_estado_idx" ON "prestamos"("solicitante_id", "estado");

-- CreateIndex
CREATE INDEX "prestamos_estado_fecha_devolucion_idx" ON "prestamos"("estado", "fecha_devolucion");

-- CreateIndex
CREATE UNIQUE INDEX "detalle_prestamo_prestamo_id_equipo_id_key" ON "detalle_prestamo"("prestamo_id", "equipo_id");

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_atendido_por_id_fkey" FOREIGN KEY ("atendido_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_prestamo" ADD CONSTRAINT "detalle_prestamo_prestamo_id_fkey" FOREIGN KEY ("prestamo_id") REFERENCES "prestamos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_prestamo" ADD CONSTRAINT "detalle_prestamo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
