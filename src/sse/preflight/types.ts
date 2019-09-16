type Severity = 1 | 2 | 3;

interface Problem {
  resolved: boolean,
  severity: Severity,
  message: string,
  tags: string[],
}

export type CheckerResults = { [id: string]: Problem }

export type PreflightResults = { [checkerId: string]: CheckerResults }
