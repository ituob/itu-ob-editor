import AsyncLock from 'async-lock';
import { remote, ipcRenderer } from 'electron';

import React, { useContext, useState, useEffect } from 'react';
import { FormGroup, InputGroup } from '@blueprintjs/core';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { WindowComponentProps } from 'coulomb/config/renderer';

import { Publication } from 'models/publications';
import { app } from 'renderer/index';
import { HelpButton } from 'renderer/widgets/help-button';
import { ObjectStorageStatus } from 'renderer/widgets/change-status';
import {
  ObjectValidators,
  ValidationErrors,
  validate,
  ValidationErrorsNotice,
  GenericValidationErrorsNotice,
} from 'renderer/form-validation';

import * as styles from './styles.scss';
import { callIPC } from 'coulomb/ipc/renderer';


const pubOperationQueue = new AsyncLock();
const SINGLETON_LOCK = 'singletonLock';


const Window: React.FC<WindowComponentProps> = function ({ query }) {
  const publicationID = query.get('objectID') || '';
  const create = query.get('create') ? true : false;

  const lang = useContext(LangConfigContext);

  /* Load publication at start */

  const _publication = app.useOne<Publication, string>('publications', publicationID);

  const [publication, setPublication] = useState({
    id: publicationID,
    url: '',
    recommendation: null,
    title: { [lang.default]: '' },
  } as Publication);

  useEffect(() => {
    const pub = _publication.object;
    if (pub) { setPublication(pub); }
  }, [JSON.stringify(_publication.object)]);


  /* Reload window if publication changed from outside */

  function handleChanged(evt: any, data: { ids: string[] }) {
    // Just reload the window if our issue question changed
    // if (data.ids.indexOf(publicationID) >= 0) {
    //   remote.getCurrentWindow().reload();
    // }
  }

  useEffect(() => {
    ipcRenderer.on('model-publications-objects-changed', handleChanged);
    return function cleanup() {
      ipcRenderer.removeListener('model-publications-objects-changed', handleChanged);
    }
  }, []);


  /* Changed status mark */

  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false);


  /* Configure form validation */

  const validators: ObjectValidators<Publication> = {
    title: {
      specified: {
        errorMessage: `have a title in ${lang.available[lang.default]}`,
        didFail: async (pub) => (pub.title[lang.default] === ''),
      },
    },
    id: {
      unique: {
        errorMessage: `have a unique ID (“${publication.id}” is already taken)`,
        didFail: async (pub) => {
          if (create === true) {
            return (await pubOperationQueue.acquire(SINGLETON_LOCK, () => get(pub.id))) !== null;
          }
          return false;
        },
      },
      specified: {
        errorMessage: "have a unique string ID",
        didFail: async (pub) => (pub.id.trim() === ''),
      },
    },
    url: {
      valid: {
        errorMessage: "contain a valid URL, if specified",
        didFail: async (pub) => {
          if (pub.url) {
            try {
              new URL(pub.url);
            } catch (e) {
              return true;
            }
          }
          return false;
        },
      },
    },
  };

  const ValidationErr = GenericValidationErrorsNotice as ValidationErrorsNotice<typeof validators>;
  const [validationErrors, setValidationErrors] = useState({} as ValidationErrors<typeof validators>);
  const [canSave, setCanSave] = useState(false);


  /* Validation publication & write to storage (if applicable) when user makes edits */

  useEffect(() => {
    setCanSave(false);

    (async () => {
      const validationErrors = await validate(publication, validators);
      const canSave = Object.keys(validationErrors).length === 0;

      setCanSave(canSave);
      setValidationErrors(validationErrors);

      if (canSave) {
        setHasUncommittedChanges(true);
      }
    })();
  }, [JSON.stringify(publication)]);


  /* IPC helpers */

  async function commitAndClose() {
    if (!canSave) {
      return;
    }
    setCanSave(false);

    await pubOperationQueue.acquire(SINGLETON_LOCK, async () => {
      if (create) {
        await callIPC<{ commit: boolean, object: Publication }, { success: true }>
        ('model-publications-create-one', {
          object: publication,
          commit: true,
        });
      } else {
        await callIPC<{ commit: boolean, objectID: string, object: Publication }, { success: true }>
        ('model-publications-update-one', {
          objectID: publication.id,
          object: publication,
          commit: true,
        });
      }
      setHasUncommittedChanges(false);
    });
  }

  return (
    <div className={styles.pubEditorWindow}>
      <ObjectStorageStatus
        objectType="SP"
        objectID={publication.id}
        paneHeaderProps={{
          actions: <HelpButton path="amend-publication/" />,
        }}
        canSave={canSave}
        doneButtonLabel={create ? "Create" : undefined}
        haveSaved={!hasUncommittedChanges}
        onCommit={commitAndClose} />

      <main className={styles.windowBody}>
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
                large={true}
                readOnly={!create}
                onChange={(evt: React.FormEvent<HTMLElement>) => {
                  setPublication({
                    ...publication,
                    id: (evt.target as HTMLInputElement).value as string,
                  });
                }}
              />
            </FormGroup>
          : null}

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
            large={true}
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              setPublication({
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
            value={publication.url}
            type="url"
            large={true}
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              setPublication({
                ...publication,
                url: (evt.target as HTMLInputElement).value as string,
              });
            }}
          />
        </FormGroup>
      </main>
    </div>
  );
};


async function get(id: string): Promise<Publication | null> {
  try {
    const pub = await callIPC<{ objectID: string }, { object: Publication | null }>
    ('model-publications-read-one', { objectID: id });
    return pub.object;
  } catch (e) {
    console.error(e);
    return null;
  }
}


export default Window;