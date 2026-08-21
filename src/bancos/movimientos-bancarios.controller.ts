import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { TipoMovimientoBancario } from '@prisma/client';
import { MovimientosBancariosService } from './movimientos-bancarios.service';
import { CreateMovimientoBancarioDto } from './dto/create-movimiento-bancario.dto';
import { SetConciliadoDto } from './dto/set-conciliado.dto';
import { ConfirmarConciliacionExtractoDto } from './dto/confirmar-conciliacion-extracto.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

@RequireModulo('CONTABILIDAD')
@RequirePantalla('BANCOS')
@Controller('movimientos-bancarios')
export class MovimientosBancariosController {
  constructor(private readonly movimientosBancariosService: MovimientosBancariosService) {}

  @Post()
  create(@Body() dto: CreateMovimientoBancarioDto) {
    return this.movimientosBancariosService.create(dto);
  }

  @Get('plantilla-extracto')
  async plantillaExtracto(@Res({ passthrough: true }) res: Response) {
    const buffer = await this.movimientosBancariosService.generarPlantillaExtracto();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla-extracto-bancario.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Post('importar-extracto')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  importarExtracto(@Query('cuentaBancariaId') cuentaBancariaId: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    return this.movimientosBancariosService.importarExtracto(cuentaBancariaId, file.buffer);
  }

  @Post('confirmar-conciliacion-extracto')
  confirmarConciliacionExtracto(@Body() dto: ConfirmarConciliacionExtractoDto) {
    return this.movimientosBancariosService.confirmarConciliacionExtracto(dto.ids);
  }

  @Get()
  findAll(
    @Query('cuentaBancariaId') cuentaBancariaId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('conciliado') conciliado?: string,
    @Query('tipo') tipo?: TipoMovimientoBancario,
  ) {
    return this.movimientosBancariosService.findAll(cuentaBancariaId, {
      desde,
      hasta,
      conciliado: conciliado === undefined ? undefined : conciliado === 'true',
      tipo,
    });
  }

  @Patch(':id/conciliar')
  setConciliado(@Param('id') id: string, @Body() dto: SetConciliadoDto) {
    return this.movimientosBancariosService.setConciliado(id, dto.conciliado);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.movimientosBancariosService.remove(id);
  }
}
