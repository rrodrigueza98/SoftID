import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_FOREIGN_EMPRESA_KEY } from '../decorators/allow-foreign-empresa.decorator';
import { AuthUser } from '../auth.types';

// Corre despues de JwtAuthGuard/RolesGuard, con request.user ya poblado.
// La UI siempre manda el empresaId del usuario logueado (via useEmpresaId()),
// asi que en trafico legitimo esto nunca rechaza nada -- es la barrera contra
// un usuario de un tenant leyendo o escribiendo datos de otro con solo
// cambiar el empresaId en el query string o en el body de un POST/PATCH.
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { user, query, body } = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser; query: Record<string, unknown>; body: Record<string, unknown> }>();

    if (!user) return true; // rutas @Public() (login) no llegan con user

    if (query?.empresaId && query.empresaId !== user.empresaId) {
      throw new ForbiddenException('No tenés acceso a los datos de esa empresa');
    }

    const permiteEmpresaAjena = this.reflector.getAllAndOverride<boolean>(ALLOW_FOREIGN_EMPRESA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permiteEmpresaAjena && body?.empresaId && body.empresaId !== user.empresaId) {
      throw new ForbiddenException('No tenés acceso a los datos de esa empresa');
    }

    return true;
  }
}
