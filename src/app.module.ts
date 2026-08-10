import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { EmpresasModule } from './empresas/empresas.module';
import { EstablecimientosModule } from './establecimientos/establecimientos.module';
import { PuntosExpedicionModule } from './puntos-expedicion/puntos-expedicion.module';
import { TimbradosModule } from './timbrados/timbrados.module';
import { CondicionesPagoModule } from './condiciones-pago/condiciones-pago.module';
import { TercerosModule } from './terceros/terceros.module';
import { ContactosTerceroModule } from './contactos-tercero/contactos-tercero.module';
import { CategoriasProductoModule } from './categorias-producto/categorias-producto.module';
import { UnidadesMedidaModule } from './unidades-medida/unidades-medida.module';
import { ProductosModule } from './productos/productos.module';
import { DepositosModule } from './depositos/depositos.module';
import { StockModule } from './stock/stock.module';
import { CuentasCorrientesModule } from './cuentas-corrientes/cuentas-corrientes.module';
import { RecibosModule } from './recibos/recibos.module';
import { ComprobantesModule } from './comprobantes/comprobantes.module';
import { ComprobantePagosModule } from './comprobante-pagos/comprobante-pagos.module';
import { CajaModule } from './caja/caja.module';
import { ContabilidadModule } from './contabilidad/contabilidad.module';
import { ComprasModule } from './compras/compras.module';
import { BancosModule } from './bancos/bancos.module';
import { OrdenesPagoModule } from './ordenes-pago/ordenes-pago.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    RolesModule,
    EmpresasModule,
    EstablecimientosModule,
    PuntosExpedicionModule,
    TimbradosModule,
    CondicionesPagoModule,
    TercerosModule,
    ContactosTerceroModule,
    CategoriasProductoModule,
    UnidadesMedidaModule,
    ProductosModule,
    DepositosModule,
    StockModule,
    CuentasCorrientesModule,
    RecibosModule,
    ComprobantesModule,
    ComprobantePagosModule,
    CajaModule,
    ContabilidadModule,
    ComprasModule,
    BancosModule,
    OrdenesPagoModule,
  ],
})
export class AppModule {}
