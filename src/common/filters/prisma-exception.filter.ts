import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

// Convierte errores de Prisma/Postgres que se escapan de los servicios (sobre
// todo en deletes) en respuestas HTTP legibles, en vez del 500 crudo que tira
// Nest por defecto. Cubre dos formas distintas en las que Prisma reporta una
// violacion de FK: como PrismaClientKnownRequestError (P2003, el caso comun)
// y como PrismaClientUnknownRequestError (cuando Postgres devuelve RESTRICT,
// codigo 23001/23503, que Prisma no siempre mapea a un codigo conocido).
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientUnknownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = this.map(exception);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private map(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError) {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return new ConflictException('Ya existe un registro con ese valor único');
        case 'P2025':
          return new NotFoundException('El registro no existe o ya fue eliminado');
        case 'P2003':
          return new BadRequestException(
            'No se puede eliminar: hay otros registros que dependen de este. Desactivalo en vez de borrarlo.',
          );
      }
    }

    // PrismaClientUnknownRequestError no trae un `code` tipado -- el detalle
    // solo viaja en el mensaje crudo de Postgres.
    const message = exception.message ?? '';
    if (/foreign key|violates.*restrict|23001|23503/i.test(message)) {
      return new BadRequestException(
        'No se puede eliminar: hay otros registros que dependen de este. Desactivalo en vez de borrarlo.',
      );
    }

    return new BadRequestException('No se pudo completar la operación');
  }
}
