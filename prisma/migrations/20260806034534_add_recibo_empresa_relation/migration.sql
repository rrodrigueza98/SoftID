-- AddForeignKey
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
