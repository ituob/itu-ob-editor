import { Translatable } from "coulomb/localizer/types"


type BasicField = {
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


type ObjectField = TextField | TranslatedTextField | NumberField | BooleanField


export type DataArray = {
  item: DataObject
} & { type: 'array' }


export type DataIndex = {
  item: DataObject
} & { type: 'index' }


export type DataObject = {
  fields: (BasicField & ObjectField)[]
} & { type: 'object' }


export type Dataset = { title?: Translatable<string> } & (DataArray | DataIndex)

export type DataItem = DataArray | DataObject