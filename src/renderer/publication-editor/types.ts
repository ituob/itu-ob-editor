import { ValidationErrors, ObjectValidators } from "renderer/form-validation";


export interface EditorViewProps<T> {
  obj: T
  onChange: (newObj: T) => void 
  validators?: ObjectValidators<T>
  validationErrors?: ValidationErrors<ObjectValidators<T>>
  create?: boolean
}

