import { BadRequestException, Body, Controller, Get, Param, Post, Query, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { TipoTercero } from '@prisma/client';
import { CuentasCorrientesService } from './cuentas-corrientes.service';
import { CreateMovimientoCCDto } from './dto/create-movimiento-cc.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

// VENTAS+CUENTAS_CORRIENTES para clientes, COMPRAS+PROVEEDORES para
// proveedores -- el service es agnostico del tipo de tercero, asi que
// alcanza con aceptar cualquiera de los dos combos (match OR).
@RequireModulo('VENTAS', 'COMPRAS')
@RequirePantalla('CUENTAS_CORRIENTES', 'PROVEEDORES')
@Controller()
export class CuentasCorrientesController {
  constructor(private readonly cuentasCorrientesService: CuentasCorrientesService) {}

  @Get('cuentas-corrientes')
  findByTercero(@Query('terceroId') terceroId: string) {
    return this.cuentasCorrientesService.findByTercero(terceroId);
  }

  @Get('cuentas-corrientes/:id/movimientos')
  findMovimientos(@Param('id') id: string) {
    return this.cuentasCorrientesService.findMovimientos(id);
  }

  @Post('movimientos-cuenta-corriente')
  registrarMovimiento(@Body() dto: CreateMovimientoCCDto) {
    return this.cuentasCorrientesService.registrarMovimientoManual(dto);
  }

  @Get('cuentas-corrientes/plantilla-saldos-iniciales')
  async plantillaSaldosIniciales(
    @Query('empresaId') empresaId: string,
    @Query('tipo') tipo: TipoTercero,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.cuentasCorrientesService.generarPlantillaSaldosIniciales(empresaId, this.tipoImportable(tipo));
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="plantilla-saldos-iniciales-${tipo === 'CLIENTE' ? 'clientes' : 'proveedores'}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @Post('cuentas-corrientes/importar-saldos-iniciales')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  importarSaldosIniciales(
    @Query('empresaId') empresaId: string,
    @Query('tipo') tipo: TipoTercero,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    return this.cuentasCorrientesService.importarSaldosIniciales(empresaId, this.tipoImportable(tipo), file.buffer);
  }

  private tipoImportable(tipo: TipoTercero): 'CLIENTE' | 'PROVEEDOR' {
    if (tipo !== 'CLIENTE' && tipo !== 'PROVEEDOR') {
      throw new BadRequestException('Elegí Clientes o Proveedores para importar.');
    }
    return tipo;
  }
}
