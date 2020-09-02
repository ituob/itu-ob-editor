import { Translatable } from '@riboseinc/coulomb/localizer/types'


export type BasicField = {
  id: string
  label: Translatable<string>
  required?: true
}


/* Value types */
// TODO: Rename *Field to *Value

type TextField = {
  type: 'text'
}

type TranslatedTextField = {
  type: 'translated-text'
}

type NumberField = {
  type: 'number'
}

type BooleanField = {
  type: 'boolean'
}

export type DataArray = {
  type: 'array'
  item: SimpleValue | DataObject
}

export type DataObject = {
  type: 'object'
  fields: (BasicField & DataItem)[]
}


// This one is only used for overall dataset structure,
// not individual values
export type DataIndex = {
  type: 'index'
  item: DataObject
}

export type SimpleValue = TextField | TranslatedTextField | NumberField | BooleanField
export type ComplexValue =  DataArray | DataObject
export type DataItem = SimpleValue | ComplexValue



/* Possible data types */

export type DataType = ('index' | DataItem["type"])

export const DATA_TYPE_LABELS: {
  [typ in DataType]: string
} = {
  'index': "index",
  'object': "object",
  'array': "array (beta)",
  'text': "text",
  'translated-text': "localized text",
  'number': "number",
  'boolean': "on/off marker",
};


/* Dataset meta. */

export interface DatasetMeta {
  title?: Translatable<string>
  schema: (DataArray & { item: DataObject }) | DataIndex
}

export interface Dataset {
  meta: DatasetMeta
  contents: DatasetContents
}

export type DatasetContents = ArrayStructure | IndexStructure


export type IndexStructure = { [key: string]: object }
export type ArrayStructure = object[]


interface ArrayDataset extends Dataset {
  meta: ArrayDatasetMeta
  contents: ArrayStructure
}

interface ArrayDatasetMeta extends DatasetMeta {
  schema: (DataArray & { item: DataObject })
}

interface IndexDataset extends Dataset {
  meta: IndexDatasetMeta
  contents: IndexStructure
}

interface IndexDatasetMeta extends DatasetMeta {
  schema: DataIndex
}



// Duck-typing datasets

export function isArray(dataset: Dataset): dataset is ArrayDataset {
  return specifiesArray(dataset.meta.schema) && containsArray(dataset.contents);
}
export function specifiesArray(schema: (DataArray & { item: DataObject }) | DataIndex): schema is (DataArray & { item: DataObject }) {
  return schema.type === 'array';
}
export function containsArray(data: ArrayStructure | IndexStructure): data is ArrayStructure {
  return Array.isArray(data);
}


export function isIndex(dataset: Dataset): dataset is IndexDataset {
  return specifiesIndex(dataset.meta.schema) && containsIndex(dataset.contents);
}
export function specifiesIndex(schema: DataArray | DataIndex): schema is DataIndex {
  return schema.type === 'index';
}
export function containsIndex(data: ArrayStructure | IndexStructure): data is IndexStructure {
  return !Array.isArray(data);
}
