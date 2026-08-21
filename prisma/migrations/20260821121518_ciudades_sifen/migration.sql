-- CreateTable
CREATE TABLE "ciudades_sifen" (
    "id" TEXT NOT NULL,
    "codigoDepartamento" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "codigoDistrito" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "codigoCiudad" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,

    CONSTRAINT "ciudades_sifen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ciudades_sifen_codigoCiudad_key" ON "ciudades_sifen"("codigoCiudad");

-- CreateIndex
CREATE INDEX "ciudades_sifen_departamento_ciudad_idx" ON "ciudades_sifen"("departamento", "ciudad");
