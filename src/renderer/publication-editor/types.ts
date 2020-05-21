import { ValidationErrors, ObjectValidators } from "renderer/form-validation";
import { Publication } from "models/publications";


export interface PublicationEditorViewProps {
  publication: Publication
  onChange: (newPub: Publication) => void 
  validators?: ObjectValidators<Publication>
  validationErrors?: ValidationErrors<ObjectValidators<Publication>>
  create?: boolean
}

