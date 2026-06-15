-- Limpia OVAs huérfanas: filas con status='generando' que no tienen ningún
-- registro en ova_jobs. Estas quedaron de sesiones de prueba anteriores al
-- sistema de jobs (o donde la creación del job falló después de crear el OVA).
-- Sin job asociado, el frontend sondea /api/ova/jobs?ova_id=<id> y recibe 404
-- indefinidamente → errores en consola + spinner eterno.
-- Las marcamos 'error' para que el frontend las trate como terminadas.
UPDATE ovas
SET status = 'error'
WHERE status = 'generando'
  AND id NOT IN (
      SELECT DISTINCT ova_id
      FROM ova_jobs
      WHERE ova_id IS NOT NULL
  );
