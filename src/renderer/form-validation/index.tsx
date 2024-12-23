import React from "react";

export type FieldValidators<Object> = {
  [checkName: string]: {
    errorMessage: string;
    didFail: (obj: Object) => Promise<boolean>;
  };
};

export type ObjectValidators<Object> = {
  [FieldName in keyof Object]?: FieldValidators<Object>;
};

export type ValidationErrors<Validators extends ObjectValidators<any>> = {
  [FieldName in keyof Validators]?: {
    [CheckName in keyof Validators[FieldName]]?: false;
  };
};

type ValidationErrorsNoticeProps<Validators extends ObjectValidators<any>> = {
  fieldName: keyof Validators & string;
  validators: Validators;
  errors: ValidationErrors<Validators>;
};

export type ValidationErrorsNotice = <V extends ObjectValidators<any>>(
  props: ValidationErrorsNoticeProps<V>
) => JSX.Element;

export const GenericValidationErrorsNotice: ValidationErrorsNotice = function ({
  fieldName,
  validators,
  errors,
}) {
  if (!validators[fieldName]) {
    throw new Error("No validator for given field name");
  }

  return (
    <>
      {Object.keys(errors[fieldName] || {}).map((validatorName: string) => (
        <li key={validatorName}>
          Must{" "}
          {
            (validators[fieldName] as FieldValidators<any>)[validatorName]
              .errorMessage
          }
          .
        </li>
      ))}
    </>
  );
};

export async function validate<Object>(
  obj: Object,
  validators: ObjectValidators<Object>
): Promise<ValidationErrors<ObjectValidators<Object>>> {
  var errs: ValidationErrors<ObjectValidators<Object>> = {};

  for (const [fieldName, fieldValidators] of Object.entries(validators)) {
    for (const [validatorName, validator] of Object.entries(
      fieldValidators as FieldValidators<Object>
    )) {
      if (await validator.didFail(obj)) {
        errs[fieldName as keyof Object] = {
          ...errs[fieldName as keyof Object],
          [validatorName]: false as const,
        };
      }
    }
  }

  return errs;
}
