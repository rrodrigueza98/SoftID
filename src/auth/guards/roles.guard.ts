import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolTipo } from '@prisma/client';
import { AuthUser } from '../auth.types';

// Corre despues de JwtAuthGuard (registrado a continuacion en AuthModule),
// que ya dejo request.user poblado. Sin @Roles() en la ruta, deja pasar
// a cualquier usuario autenticado.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RolTipo[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user || !required.includes(user.rolTipo)) {
      throw new ForbiddenException('No tenés permisos para realizar esta acción');
    }
    return true;
  }
}
