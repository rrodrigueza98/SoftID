import { SetMetadata } from '@nestjs/common';
import { Modulo } from '@prisma/client';

export const MODULO_KEY = 'modulo';

// Restringe una ruta a alguno de estos modulos (ver ModulosGuard). Solo
// afecta a un OPERADOR con modulosPermitidos configurado explicitamente --
// ADMIN, superadmin y operadores sin restriccion (lista vacia, el default)
// siempre pasan.
export const RequireModulo = (...modulos: Modulo[]) => SetMetadata(MODULO_KEY, modulos);
