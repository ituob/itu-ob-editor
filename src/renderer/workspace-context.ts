/* This context aims to provide OB data throughout the app.
   The data is intended to be read only, no changes will get synced back to storage.
   Refresh method is provided to fetch new data from storage. */

import React from 'react';

import { Index } from 'sse/storage/query';
import { OBIssue } from 'models/issues';
import { Publication } from 'models/publications';
import { ITURecommendation } from 'models/recommendations';


interface WorkspaceContextSpec {
  current: { issues: Index<OBIssue>, publications: Index<Publication>, recommendations: Index<ITURecommendation> },
  refresh(): Promise<void>,
}

export const WorkspaceContext = React.createContext<WorkspaceContextSpec>({
  current: {
    issues: {},
    publications: {},
    recommendations: {},
  },
  refresh: async () => {},
});
