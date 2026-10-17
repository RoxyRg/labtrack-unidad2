import { Rol } from '@prisma/client';
import type { Request } from 'express';

export type AuthenticatedUser = { id: number; correo: string; rol: Rol };
export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
