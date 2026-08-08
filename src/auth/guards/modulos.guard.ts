import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY } from '../decorators/modulo.decorator';
import { Modulo } from '@prisma/client';
import { AuthUser } from '../auth.types';

// Corre despues de RolesGuard, con request.user ya poblado. A diferencia de
// RolesGuard (que es todo o nada por tipo de rol), este acota que modulos
// operativos puede tocar un OPERADOR puntual -- pero solo si el admin le
// configuro una lista; sin @RequireModulo() en la ruta, o con
// modulosPermitidos vacio, no restringe nada.
@Injectable()
export class ModulosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Modulo[]>(MODULO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) return true; // rutas @Public() no llegan con user

    if (user.esSuperAdmin || user.rolTipo === 'ADMIN' || user.modulosPermitidos.length === 0) {
      return true;
    }

    if (!required.some((m) => user.modulosPermitidos.includes(m))) {
      throw new ForbiddenException('Tu usuario no tiene acceso a este módulo');
    }
    return true;
  }
}
