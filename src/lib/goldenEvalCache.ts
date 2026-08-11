export interface GoldenEvalSummary {
  total: number;
  passed: number;
  passRatePercentage: number;
  ranAt: string;
  byCategory: { category: string; total: number; passed: number }[];
}

let lastResult: GoldenEvalSummary | null = null;

export function setLastGoldenEvalResult(summary: GoldenEvalSummary): void {
  lastResult = summary;
}

export function getLastGoldenEvalResult(): GoldenEvalSummary | null {
  return lastResult;
}
