import { SetMetadata } from '@nestjs/common';
import { Pantalla } from '@prisma/client';

export const PANTALLA_KEY = 'pantalla';

// Restringe una ruta a alguna de estas pantallas (ver PantallasGuard). Es un
// segundo nivel, mas fino que @RequireModulo -- un operador puede tener el
// modulo Ventas permitido pero solo la pantalla Punto de venta dentro de el.
// Solo afecta a un OPERADOR con pantallasPermitidas configurado
// explicitamente; sin este decorador, o con la lista vacia, no restringe.
export const RequirePantalla = (...pantallas: Pantalla[]) => SetMetadata(PANTALLA_KEY, pantallas);
