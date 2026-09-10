-- ============================================================
-- Dashboard Operativo: métricas de Inspecciones en Campo calculadas en el
-- servidor (Postgres) sobre TODA la tabla, en vez de traer hasta 200 filas
-- al navegador y calcular ahí. Con la carga masiva de decenas de miles de
-- filas históricas, ese recorte de "las N más recientes por fecha de
-- creación" dejaba las métricas del dashboard completamente incorrectas
-- (reflejaban solo una fracción mínima de los registros reales).
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_field_inspections_fecha ON field_inspections(fecha);
CREATE INDEX IF NOT EXISTS idx_field_inspections_area_proceso ON field_inspections(area_proceso);

CREATE OR REPLACE FUNCTION field_inspections_dashboard_stats(days_back INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE sql
STABLE
AS $$
  WITH period AS (
    -- Mismos límites que compareToPreviousPeriod() en src/lib/dashboardTrend.ts
    -- (usado antes en el cliente): actual = fecha >= hoy-days_back;
    -- anterior = [hoy-2*days_back, hoy-days_back).
    SELECT
      CURRENT_DATE - (days_back - 1) AS period_start,
      CURRENT_DATE - days_back AS current_cutoff,
      CURRENT_DATE - (2 * days_back) AS prev_cutoff
  ),
  trend_days AS (
    SELECT generate_series((SELECT period_start FROM period), CURRENT_DATE, interval '1 day')::date AS day
  )
  SELECT json_build_object(
    'total', (SELECT COUNT(*) FROM field_inspections),
    'approvedCount', (SELECT COUNT(*) FROM field_inspections WHERE estado ILIKE 'Aprobado%'),
    'rejectedCount', (SELECT COUNT(*) FROM field_inspections WHERE estado = 'Rechazado'),
    'criticalCount', (SELECT COUNT(*) FROM field_inspections WHERE alert_level = 'Critical'),
    'cantTotalSum', (SELECT COALESCE(SUM(cant_total), 0) FROM field_inspections),
    'cantRetenidaSum', (SELECT COALESCE(SUM(cant_retenida), 0) FROM field_inspections),
    'byEstado', (
      SELECT COALESCE(json_agg(json_build_object('name', estado, 'value', cnt) ORDER BY cnt DESC), '[]'::json)
      FROM (SELECT estado, COUNT(*) AS cnt FROM field_inspections GROUP BY estado) t
    ),
    'byDefecto', (
      SELECT COALESCE(json_agg(json_build_object('name', defecto, 'value', cnt) ORDER BY cnt DESC), '[]'::json)
      FROM (
        SELECT defecto, COUNT(*) AS cnt FROM field_inspections
        WHERE defecto IS NOT NULL AND defecto <> 'NINGUNO'
        GROUP BY defecto ORDER BY COUNT(*) DESC LIMIT 8
      ) t
    ),
    'byArea', (
      SELECT COALESCE(json_agg(json_build_object('name', area_proceso, 'value', cnt) ORDER BY cnt DESC), '[]'::json)
      FROM (
        SELECT area_proceso, COUNT(*) AS cnt FROM field_inspections
        GROUP BY area_proceso ORDER BY COUNT(*) DESC LIMIT 10
      ) t
    ),
    'trend', (
      SELECT COALESCE(json_agg(json_build_object(
        'date', td.day,
        'total', COALESCE(c.total, 0),
        'rechazadas', COALESCE(c.rechazadas, 0)
      ) ORDER BY td.day), '[]'::json)
      FROM trend_days td
      LEFT JOIN (
        SELECT fecha, COUNT(*) AS total, COUNT(*) FILTER (WHERE estado = 'Rechazado') AS rechazadas
        FROM field_inspections
        WHERE fecha >= (SELECT period_start FROM period)
        GROUP BY fecha
      ) c ON c.fecha = td.day
    ),
    'periodComparison', json_build_object(
      'current', (SELECT COUNT(*) FROM field_inspections WHERE fecha >= (SELECT current_cutoff FROM period)),
      'previous', (
        SELECT COUNT(*) FROM field_inspections
        WHERE fecha >= (SELECT prev_cutoff FROM period) AND fecha < (SELECT current_cutoff FROM period)
      )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION field_inspections_dashboard_stats(INTEGER) TO service_role, authenticated, anon;
