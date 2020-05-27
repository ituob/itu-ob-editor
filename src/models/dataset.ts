import { Translatable } from "coulomb/localizer/types"


export type BasicField = {
  id: string
  label: Translatable<string>
  required?: true
}

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
  item: SimpleValue | DataObject
} & { type: 'array' }


export type DataObject = {
  fields: (BasicField & DataItem)[]
} & { type: 'object' }


export type DataType = ('index' | DataItem["type"])


export type SimpleValue = TextField | TranslatedTextField | NumberField | BooleanField
export type ComplexValue =  DataArray | DataObject
export type DataItem = SimpleValue | ComplexValue


export type DataIndex = {
  item: DataObject
} & { type: 'index' }


/* Dataset meta. */
export interface DatasetMeta {
  title?: Translatable<string>
  schema: DataArray | DataIndex
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
  schema: DataArray
}

interface IndexDataset extends Dataset {
  meta: IndexDatasetMeta
  contents: IndexStructure
}

interface IndexDatasetMeta extends DatasetMeta {
  schema: DataIndex
}


export function isArray(dataset: Dataset): dataset is ArrayDataset {
  return specifiesArray(dataset.meta.schema) && containsArray(dataset.contents);
}
export function specifiesArray(schema: DataArray | DataIndex): schema is DataArray {
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