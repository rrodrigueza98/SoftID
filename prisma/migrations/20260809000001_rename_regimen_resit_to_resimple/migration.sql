-- Corrige el nombre del regimen: no existe "IRE RESIT" en la legislacion
-- paraguaya, el regimen simplificado para pequenas empresas es RESIMPLE.
-- RENAME VALUE preserva automaticamente las filas que ya usaban el valor
-- viejo (no hace falta un UPDATE aparte).
ALTER TYPE "RegimenTributario" RENAME VALUE 'IRE_RESIT' TO 'IRE_RESIMPLE';
