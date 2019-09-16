import { Index, IndexableObject } from './query';

export type Workspace = { [indexName: string]: Index<IndexableObject> }

