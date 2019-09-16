import { CheckerResults } from './types';
import { Workspace } from 'sse/storage/workspace';


interface PreflightChecker {
  id: string,
  label: string,
  process: (ws: Workspace) => Promise<CheckerResults>,
}


class PreflightCheckerRegistry {
  checkers: { [checkerId: string]: PreflightChecker } = {}

  register(id: string, checker: PreflightChecker) {
    this.checkers[id] = checker;
  }
}


export const registry = new PreflightCheckerRegistry();
