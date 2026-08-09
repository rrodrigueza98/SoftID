import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Se re-consulta el usuario en cada request (en vez de confiar ciegamente
  // en el payload) para que desactivar un usuario corte el acceso de
  // inmediato, aunque su token todavia no haya expirado.
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { rol: true },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario inexistente o inactivo');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      empresaId: usuario.empresaId,
      rolId: usuario.rolId,
      rolNombre: usuario.rol.nombre,
      rolTipo: usuario.rol.tipo,
      esSuperAdmin: usuario.esSuperAdmin,
      modulosPermitidos: usuario.modulosPermitidos,
      puntosExpedicionPermitidos: usuario.puntosExpedicionPermitidos,
      pantallasPermitidas: usuario.pantallasPermitidas,
    };
  }
}
