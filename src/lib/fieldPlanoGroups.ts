/**
 * Parseo de "Plano/Ítems" y "Cant. Total" para el registro masivo de
 * Inspecciones en Campo — permite registrar en un solo envío varios planos
 * de una misma OP, cada uno (o cada grupo/rango) con su propia cantidad.
 *
 * Ejemplo: Plano/Ítems = "1-5, 8, 9, 13, 15" y Cant. Total = "1,2,1,3,1"
 * crea 9 inspecciones (planos 1,2,3,4,5,8,9,13,15) donde el rango "1-5"
 * comparte la cantidad 1, el plano 8 tiene cantidad 2, el 9 tiene 1, el 13
 * tiene 3 y el 15 tiene 1 — sin este módulo, puro no server-side.
 */

export interface PlanoGroup {
  /** Texto tal cual lo escribió el usuario para este grupo, ej. "1-5" u "8". */
  raw: string;
  /** Planos expandidos de ese grupo, ej. ['1','2','3','4','5']. */
  planos: string[];
}

function expandToken(token: string): string[] {
  if (token.includes('-')) {
    const [start, end] = token.split('-').map(n => parseInt(n.trim(), 10));
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      const planos: string[] = [];
      for (let i = start; i <= end; i++) planos.push(i.toString());
      return planos;
    }
  }
  return [token];
}

/** Divide "1-5, 8, 9, 13, 15" en sus grupos separados por coma, expandiendo cada rango. */
export function parsePlanoGroups(input: string): PlanoGroup[] {
  return input
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(raw => ({ raw, planos: expandToken(raw) }));
}

/** Lista plana, sin duplicados y ordenada numéricamente — para usos que no necesitan la agrupación (ej. búsquedas). */
export function flattenPlanoGroups(groups: PlanoGroup[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const g of groups) {
    for (const p of g.planos) {
      if (!seen.has(p)) {
        seen.add(p);
        result.push(p);
      }
    }
  }
  return result.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.localeCompare(b);
  });
}

export interface CantidadMatchResult {
  success: boolean;
  error?: string;
  /** Cantidad asignada a cada grupo de plano, en el mismo orden que `parsePlanoGroups`. */
  cantidadesPorGrupo?: number[];
}

/**
 * Empareja la "Cant. Total" ingresada con los grupos de plano detectados.
 * Una sola cantidad se aplica a todos los grupos (comportamiento clásico);
 * si se ingresa más de una, debe haber exactamente una por grupo — nunca
 * se adivina un emparejamiento ambiguo, para no asignar una cantidad
 * incorrecta en silencio.
 */
export function matchCantidadesToGroups(cantidadInput: string, groupCount: number): CantidadMatchResult {
  const tokens = cantidadInput
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return { success: false, error: 'Se requiere la cantidad total.' };
  }

  const effectiveGroupCount = Math.max(groupCount, 1);

  if (tokens.length === 1) {
    const value = parseInt(tokens[0], 10);
    if (isNaN(value)) return { success: false, error: `Cantidad inválida: "${tokens[0]}".` };
    return { success: true, cantidadesPorGrupo: Array(effectiveGroupCount).fill(value) };
  }

  if (tokens.length !== effectiveGroupCount) {
    return {
      success: false,
      error: `Ingresaste ${effectiveGroupCount} grupo(s) en "Plano/Ítems" pero ${tokens.length} cantidad(es) en "Cant. Total". Escribe una sola cantidad para aplicarla a todos, o exactamente una cantidad por cada grupo separado por coma (los rangos como "1-5" cuentan como un solo grupo).`
    };
  }

  const values: number[] = [];
  for (const t of tokens) {
    const value = parseInt(t, 10);
    if (isNaN(value)) return { success: false, error: `Cantidad inválida: "${t}".` };
    values.push(value);
  }
  return { success: true, cantidadesPorGrupo: values };
}
