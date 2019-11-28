import React from 'react';


type FieldValidators<Object> = {
  [checkName: string]: {
    errorMessage: string,
    didFail: (obj: Object) => Promise<boolean>,
  }
};

export type ObjectValidators<Object> = {
  [FieldName in keyof Object]?: FieldValidators<Object>
};


export type ValidationErrors<Validators extends ObjectValidators<any>> = {
  [FieldName in keyof Validators]?: {
    [CheckName in keyof Validators[FieldName]]?: false
  }
};


type ValidationErrorsNoticeProps<Validators extends ObjectValidators<any>> = {
  fieldName: string & keyof Validators,
  validators: Validators,
  errors: ValidationErrors<Validators>,
}
// Generic React functional components require a workaround in TS
export type ValidationErrorsNotice<V = ObjectValidators<any>> = React.FC<ValidationErrorsNoticeProps<V>>
export const GenericValidationErrorsNotice: ValidationErrorsNotice = function ({ fieldName, validators, errors }) {
  /* Given field name, validators, and validation errors,
     formats validation error notice as a sequence of <li> tags. */

  if (!validators[fieldName]) { throw new Error("No validator for given field name"); }

  return <>
    {Object.keys(errors[fieldName] || {}).map((validatorName: string) =>
      <li>Must {(validators[fieldName] as FieldValidators<any>)[validatorName].errorMessage}.</li>
    )}
  </>;

};


export async function validate<Object>(obj: Object, validators: ObjectValidators<Object>): Promise<ValidationErrors<ObjectValidators<Object>>> {
  /* Validates given object with given validators. */

  var errs: ValidationErrors<ObjectValidators<Object>> = {};

  for (const [fieldName, fieldValidators] of Object.entries(validators)) {
    for (const [validatorName, validator] of Object.entries(fieldValidators as FieldValidators<Object>)) {
      if (await validator.didFail(obj)) {
        errs[fieldName as keyof Object] = {
          ...errs[fieldName as keyof Object],
          [validatorName]: false as false,
          // Without as-casting false is typed as wider boolean, but we literally only allow false.
        };
      }
    }
  }

  return errs;
};
