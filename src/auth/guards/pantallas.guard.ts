import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PANTALLA_KEY } from '../decorators/pantalla.decorator';
import { Pantalla } from '@prisma/client';
import { AuthUser } from '../auth.types';

// Corre despues de ModulosGuard. Mismo mecanismo (opt-in por ruta via
// decorador, solo restringe a un OPERADOR con lista configurada), pero un
// nivel mas fino: dentro de un modulo permitido, acota a pantallas puntuales.
@Injectable()
export class PantallasGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Pantalla[]>(PANTALLA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) return true;

    if (user.esSuperAdmin || user.rolTipo === 'ADMIN' || user.pantallasPermitidas.length === 0) {
      return true;
    }

    if (!required.some((p) => user.pantallasPermitidas.includes(p))) {
      throw new ForbiddenException('Tu usuario no tiene acceso a esta pantalla');
    }
    return true;
  }
}
