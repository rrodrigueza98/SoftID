import { SetMetadata } from '@nestjs/common';
import { RolTipo } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Restringe una ruta a usuarios cuyo Rol tenga alguno de estos tipos
// (ver RolesGuard). Sin este decorador, cualquier usuario autenticado
// puede acceder -- el guard es opt-in por ruta, no un allowlist global.
export const Roles = (...roles: RolTipo[]) => SetMetadata(ROLES_KEY, roles);
