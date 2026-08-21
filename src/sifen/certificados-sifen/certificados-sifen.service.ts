import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { decryptBuffer, encryptBuffer, parseEncryptionKey } from '../../common/crypto/encryption.util';
import { extraerCertificado } from '../signing/p12.util';
import { UploadCertificadoSifenDto } from './dto/upload-certificado-sifen.dto';

export interface CredencialesSifen {
  ambiente: 'TEST' | 'PRODUCCION';
  p12Buffer: Buffer;
  password: string;
  csc: string | null;
  idCsc: string | null;
}

@Injectable()
export class CertificadosSifenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private encryptionKey(): Buffer {
    return parseEncryptionKey(this.config.getOrThrow<string>('ENCRYPTION_KEY'));
  }

  // Metadata de solo lectura -- nunca devuelve el .p12 ni las contrasenas.
  async findMetadata(empresaId: string) {
    const certificado = await this.prisma.certificadoSifen.findUnique({ where: { empresaId } });
    if (!certificado) return null;
    return {
      ambiente: certificado.ambiente,
      subjectCn: certificado.subjectCn,
      numeroSerie: certificado.numeroSerie,
      fechaEmisionCert: certificado.fechaEmisionCert,
      fechaVencimiento: certificado.fechaVencimiento,
      tieneCsc: Boolean(certificado.cscCifrado),
      activo: certificado.activo,
      updatedAt: certificado.updatedAt,
    };
  }

  async upload(empresaId: string, dto: UploadCertificadoSifenDto, p12Buffer: Buffer) {
    // Se valida que el .p12 y la contrasena sean legibles ANTES de cifrar y
    // guardar nada -- si estan mal, mejor fallar aca que descubrirlo recien
    // al intentar firmar el primer Documento Electronico.
    let metadata;
    try {
      metadata = extraerCertificado(p12Buffer, dto.password);
    } catch (err) {
      throw new BadRequestException(
        `No se pudo leer el certificado: ${err instanceof Error ? err.message : 'archivo o contraseña inválidos'}`,
      );
    }

    const key = this.encryptionKey();
    const p12Enc = encryptBuffer(p12Buffer, key);
    const passwordEnc = encryptBuffer(Buffer.from(dto.password, 'utf8'), key);
    const cscEnc = dto.csc ? encryptBuffer(Buffer.from(dto.csc, 'utf8'), key) : null;

    const data = {
      empresaId,
      ambiente: dto.ambiente,
      p12Cifrado: p12Enc.ciphertext,
      p12Iv: p12Enc.iv,
      p12AuthTag: p12Enc.authTag,
      passwordCifrada: passwordEnc.ciphertext,
      passwordIv: passwordEnc.iv,
      passwordAuthTag: passwordEnc.authTag,
      cscCifrado: cscEnc?.ciphertext,
      cscIv: cscEnc?.iv,
      cscAuthTag: cscEnc?.authTag,
      idCsc: dto.idCsc,
      subjectCn: metadata.subjectCn,
      numeroSerie: metadata.numeroSerie,
      fechaEmisionCert: metadata.fechaEmision,
      fechaVencimiento: metadata.fechaVencimiento,
      activo: true,
    };

    await this.prisma.certificadoSifen.upsert({
      where: { empresaId },
      create: data,
      update: data,
    });

    return this.findMetadata(empresaId);
  }

  // Uso interno de SifenService al firmar/enviar -- nunca se expone via
  // controller. Descifra en memoria, nunca persiste el resultado.
  async obtenerCredenciales(empresaId: string): Promise<CredencialesSifen> {
    const certificado = await this.prisma.certificadoSifen.findUnique({ where: { empresaId } });
    if (!certificado || !certificado.activo) {
      throw new NotFoundException(`La empresa ${empresaId} no tiene un certificado SIFEN configurado`);
    }

    const key = this.encryptionKey();
    const p12Buffer = decryptBuffer({ ciphertext: certificado.p12Cifrado, iv: certificado.p12Iv, authTag: certificado.p12AuthTag }, key);
    const password = decryptBuffer(
      { ciphertext: certificado.passwordCifrada, iv: certificado.passwordIv, authTag: certificado.passwordAuthTag },
      key,
    ).toString('utf8');
    const csc =
      certificado.cscCifrado && certificado.cscIv && certificado.cscAuthTag
        ? decryptBuffer({ ciphertext: certificado.cscCifrado, iv: certificado.cscIv, authTag: certificado.cscAuthTag }, key).toString('utf8')
        : null;

    return { ambiente: certificado.ambiente, p12Buffer, password, csc, idCsc: certificado.idCsc };
  }
}
