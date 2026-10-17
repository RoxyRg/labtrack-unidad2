'use strict';

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const correo = (
    process.env.LABTRACK_SOLICITANTE_CORREO || ''
  ).trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new Error('Debes indicar un correo válido.');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: 1 },
  });

  if (
    !usuario ||
    usuario.rol !== 'SOLICITANTE' ||
    usuario.correo !== 'alumno.prueba@example.com'
  ) {
    throw new Error(
      'El usuario original no coincide. No se modificó ningún registro.'
    );
  }

  const actualizado = await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      nombre: 'Méndez Fernández Alan Eusebio',
      correo,
    },
    select: {
      id: true,
      nombre: true,
      matricula: true,
      correo: true,
      rol: true,
      activo: true,
    },
  });

  console.log('SOLICITANTE actualizado correctamente:');
  console.log(actualizado);
}

main()
  .catch(error => {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
