import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { CreateCuentaBancariaDto } from './dto/create-cuenta-bancaria.dto';
import { UpdateCuentaBancariaDto } from './dto/update-cuenta-bancaria.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

@RequireModulo('CONTABILIDAD')
@RequirePantalla('BANCOS')
@Controller('cuentas-bancarias')
export class CuentasBancariasController {
  constructor(private readonly cuentasBancariasService: CuentasBancariasService) {}

  @Post()
  create(@Body() dto: CreateCuentaBancariaDto) {
    return this.cuentasBancariasService.create(dto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId: string) {
    return this.cuentasBancariasService.findAll(empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cuentasBancariasService.findOne(id);
  }

  @Get(':id/saldo')
  async saldo(@Param('id') id: string, @Query('hasta') hasta?: string) {
    const saldo = await this.cuentasBancariasService.calcularSaldo(id, hasta ? new Date(hasta) : undefined);
    return { saldo };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCuentaBancariaDto) {
    return this.cuentasBancariasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cuentasBancariasService.remove(id);
  }
}
