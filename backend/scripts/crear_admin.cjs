'use strict';

const { PrismaClient, Rol } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const nombre = (process.env.LABTRACK_ADMIN_NOMBRE || '').trim();
const correo = (process.env.LABTRACK_ADMIN_CORREO || '').trim().toLowerCase();
const password = process.env.LABTRACK_ADMIN_PASSWORD || '';

async function main() {
  if (nombre.length < 2) {
    throw new Error('El nombre debe tener al menos 2 caracteres.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new Error('Introduce un correo válido.');
  }

  if (
    password.length < 12 ||
    password.length > 72 ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new Error(
      'La contraseña debe tener entre 12 y 72 caracteres, letras y números.'
    );
  }

  const existente = await prisma.usuario.findUnique({
    where: { correo },
  });

  if (existente) {
    throw new Error(
      'Ese correo ya está registrado. No se modificarán sus permisos.'
    );
  }

  const admin = await prisma.usuario.create({
    data: {
      nombre,
      correo,
      passwordHash: await bcrypt.hash(password, 12),
      rol: Rol.ADMIN,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      activo: true,
    },
  });

  console.log('ADMIN creado correctamente:');
  console.log(admin);
}

main()
  .catch((error) => {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
