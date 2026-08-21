import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CodigosCiudad {
  codigoDistrito: string;
  codigoCiudad: string;
}

function normalizar(texto: string): string {
  return texto
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Resuelve el "ciudad" en texto libre de un Establecimiento/Empresa al par
// de codigos (distrito, ciudad) que exige SIFEN en cDisEmi/cCiuEmi, contra
// la tabla ciudades_sifen (importada completa desde el "Codigo de
// Referencia Geografica" oficial de la DNIT -- ver CiudadSifen en
// schema.prisma). El caso comun es que el texto libre coincida
// directamente con el nombre de una ciudad de la tabla, que a su vez suele
// coincidir con el nombre del distrito (asi sale en un DE real: distrito
// "LUQUE", ciudad "LUQUE").
@Injectable()
export class CiudadesSifenService {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(nombreCiudad: string): Promise<CodigosCiudad> {
    const normalizado = normalizar(nombreCiudad);

    let fila = await this.prisma.ciudadSifen.findFirst({ where: { ciudad: normalizado } });

    // Si no hay una fila de "ciudad" con exactamente ese nombre, se prueba
    // contra el nombre de distrito -- cubre el caso de alguien que carga el
    // nombre del distrito pero la tabla no tiene una localidad homonima
    // (poco comun, pero pasa en distritos chicos sin subdivision).
    if (!fila) {
      fila = await this.prisma.ciudadSifen.findFirst({ where: { distrito: normalizado } });
    }

    // Asuncion (la capital) figura en la tabla oficial como "ASUNCION
    // (DISTRITO)", no como "ASUNCION" a secas -- probamos con el sufijo
    // antes de rendirnos, para no obligar a cargar el nombre exacto tal
    // cual lo escribe la DNIT.
    if (!fila) {
      const conSufijo = `${normalizado} (DISTRITO)`;
      fila = await this.prisma.ciudadSifen.findFirst({
        where: { OR: [{ ciudad: conSufijo }, { distrito: conSufijo }] },
      });
    }

    if (!fila) {
      throw new Error(
        `CiudadesSifenService: "${nombreCiudad}" no coincide con ninguna ciudad/distrito de la Tabla de Ciudades de SIFEN. Verificá que el campo "Ciudad" del establecimiento/empresa este escrito igual que en el padron oficial (ej. "LUQUE", sin abreviar).`,
      );
    }

    return { codigoDistrito: fila.codigoDistrito, codigoCiudad: fila.codigoCiudad };
  }
}
