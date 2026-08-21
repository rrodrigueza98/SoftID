import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CertificadosSifenService } from './certificados-sifen.service';
import { UploadCertificadoSifenDto } from './dto/upload-certificado-sifen.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';

// El certificado SIFEN es especifico de cada empresa (un RUC = un
// certificado) y es informacion sensible -- solo un ADMIN de esa misma
// empresa (o superadmin) puede subirlo o ver su metadata. Mismo patron de
// verificarPertenencia que EmpresasController.
@Roles('ADMIN')
@Controller('sifen/certificados')
export class CertificadosSifenController {
  constructor(private readonly certificadosSifenService: CertificadosSifenService) {}

  @Get()
  async findMetadata(@Query('empresaId') empresaId: string, @CurrentUser() usuario: AuthUser) {
    this.verificarPertenencia(empresaId, usuario);
    return this.certificadosSifenService.findMetadata(empresaId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(
    @Query('empresaId') empresaId: string,
    @Body() dto: UploadCertificadoSifenDto,
    @CurrentUser() usuario: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    this.verificarPertenencia(empresaId, usuario);
    if (!file) throw new BadRequestException('No se recibió ningún archivo .p12/.pfx');
    return this.certificadosSifenService.upload(empresaId, dto, file.buffer);
  }

  private verificarPertenencia(empresaId: string, usuario: AuthUser) {
    if (!usuario.esSuperAdmin && empresaId !== usuario.empresaId) {
      throw new ForbiddenException('No tenés acceso a esta empresa');
    }
  }
}
