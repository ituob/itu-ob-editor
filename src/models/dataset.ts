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
  item: DataObject
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


export type Dataset = { title?: Translatable<string> } & (DataArray | DataIndex)