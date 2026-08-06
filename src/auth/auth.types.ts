// Forma del usuario autenticado adjuntado a `request.user` por JwtStrategy,
// y del payload que viaja dentro del propio JWT.
export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  empresaId: string;
  rolId: string;
  rolNombre: string;
}

export interface JwtPayload {
  sub: string; // usuarioId
  email: string;
  empresaId: string;
  rolId: string;
}
