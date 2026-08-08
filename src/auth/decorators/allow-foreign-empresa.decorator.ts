import { SetMetadata } from '@nestjs/common';

export const ALLOW_FOREIGN_EMPRESA_KEY = 'allowForeignEmpresa';

// Excepcion puntual a TenantGuard: permite que el body lleve un empresaId
// distinto al del usuario autenticado. Uso exclusivo para las altas de
// aprovisionamiento de un tenant nuevo (crear sus roles y su primer
// usuario), donde quien ejecuta la accion todavia esta logueado con su
// propia empresa mientras arma la del cliente.
export const AllowForeignEmpresa = () => SetMetadata(ALLOW_FOREIGN_EMPRESA_KEY, true);
