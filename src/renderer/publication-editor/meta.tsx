import { remote } from 'electron';
import React, { useContext } from 'react';
import { FormGroup, InputGroup, NonIdealState } from '@blueprintjs/core';
import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';
import { GenericValidationErrorsNotice, ValidationErrorsNotice } from 'renderer/form-validation';
import { Publication } from 'models/publications';
import { EditorViewProps } from './types';
import styles from './styles.scss';


interface MetaEditorProps extends EditorViewProps<Publication> {}


const EditPublicationMeta: React.FC<MetaEditorProps> =
function ({ obj, create, onChange, validators, validationErrors }) {
  const lang = useContext(LangConfigContext);
  const publication = obj;

  if (!onChange || validators === undefined || validationErrors === undefined) {
    return <NonIdealState
      icon="heart-broken"
      title="Apologies"
      description="This view was misconfigured. Please contact application developers for assistance." />;
  }

  const ValidationErr = GenericValidationErrorsNotice as ValidationErrorsNotice<typeof validators>;

  return (
    <div className={styles.publicationMetaEditor}>
      <FormGroup
          key="title"
          intent={validationErrors.title ? "danger" : undefined}
          helperText={
            <ul><ValidationErr fieldName="title" validators={validators} errors={validationErrors} /></ul>
          }
          label={`Title in ${lang.available[lang.default]}:`}>
        <InputGroup
          value={publication.title[lang.default]}
          type="text"
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            onChange({
              ...publication,
              title: {
                ...publication.title,
                [lang.default]: (evt.target as HTMLInputElement).value as string,
              },
            });
          }}
        />
      </FormGroup>

      <FormGroup
          key="url"
          intent={validationErrors.url ? "danger" : undefined}
          helperText={
            <ul>
              <ValidationErr fieldName="url" validators={validators} errors={validationErrors} />
              {!validationErrors.url && (publication.url || '') !== ''
                ? <li><a onClick={() => remote.shell.openExternal(publication.url as string)}>Test this URL in browser</a></li>
                : null}
            </ul>
          }
          label="Authoritative resource URL for this publication:">
        <InputGroup
          value={publication.url || ''}
          type="url"
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            const newURL = (evt.target as HTMLInputElement).value as string;
            onChange({
              ...publication,
              url: newURL.trim() !== '' ? newURL : undefined,
            });
          }}
        />
      </FormGroup>

      {create
        ? <FormGroup
              key="id"
              label="Publication identifier:"
              intent={validationErrors.id ? "danger" : undefined}
              helperText={
                <ul>
                  <ValidationErr fieldName="id" validators={validators} errors={validationErrors} />
                  <li>Use uppercase English string as publication ID: e.g., BUREAUFAX.</li>
                  <li>Choose an ID consistent with publication URL on ITU website, if possible.</li>
                  <li>Note: you can’t change this later easily.</li>
                </ul>}>
            <InputGroup
              value={publication.id}
              type="text"
              large
              readOnly={!create}
              onChange={(evt: React.FormEvent<HTMLElement>) => {
                onChange({
                  ...publication,
                  id: (evt.target as HTMLInputElement).value as string,
                });
              }}
            />
          </FormGroup>
        : <FormGroup
              label="Publication ID"
              helperText="ID of a service publication cannot be changed after it is created.">
            <InputGroup large type="string" disabled defaultValue={`${publication.id}`} />
          </FormGroup>}
    </div>
  );
};


export default EditPublicationMeta;