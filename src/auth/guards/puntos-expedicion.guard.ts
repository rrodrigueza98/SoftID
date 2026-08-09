import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthUser } from '../auth.types';

// Corre despues de RolesGuard/TenantGuard, con request.user ya poblado. A
// diferencia de ModulosGuard (estatico por ruta), este lee el
// puntoExpedicionId que venga en el body o el query -- cubre tanto
// POST /comprobantes (emitir) como POST /caja/sesiones (abrir caja) y
// GET /caja/sesiones/actual, sin necesitar un decorador por ruta.
// La lectura por :id (findOne/anular) y el listado filtrado se resuelven
// aparte en ComprobantesService, porque ahi el puntoExpedicionId no viaja
// en la request sino que hay que buscarlo en la base.
@Injectable()
export class PuntosExpedicionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user, query, body } = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser; query: Record<string, unknown>; body: Record<string, unknown> }>();

    if (!user) return true;
    if (user.esSuperAdmin || user.rolTipo === 'ADMIN' || user.puntosExpedicionPermitidos.length === 0) {
      return true;
    }

    const puntoExpedicionId = (body?.puntoExpedicionId ?? query?.puntoExpedicionId) as string | undefined;
    if (puntoExpedicionId && !user.puntosExpedicionPermitidos.includes(puntoExpedicionId)) {
      throw new ForbiddenException('Tu usuario no tiene acceso a ese punto de expedición');
    }

    return true;
  }
}
