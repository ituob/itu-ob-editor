import AsyncLock from 'async-lock';
import { remote, ipcRenderer } from 'electron';

import React, { useContext, useState, useEffect } from 'react';
import { FormGroup, InputGroup } from '@blueprintjs/core';

import { request } from 'sse/api/renderer';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { LangConfigContext } from 'sse/localizer/renderer';

import { useModified } from 'storage/renderer';

import { Publication } from 'models/publications';
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


const pubOperationQueue = new AsyncLock();
const SINGLETON_LOCK = 'singletonLock';


interface PublicationEditorProps {
  publicationId: string,
  create: boolean,
}
export const PublicationEditor: React.FC<PublicationEditorProps> = function ({ publicationId, create }) {
  const lang = useContext(LangConfigContext);

  /* Load publication at start */

  const [publication, setPublication] = useState({
    id: publicationId,
    url: '',
    recommendation: null,
    title: { [lang.default]: '' },
  } as Publication);

  useEffect(() => {
    (async () => {
      const pub = await get(publication.id);
      if (pub) { setPublication(pub); }
    })();
  }, []);


  /* Reload window if publication changed from outside */

  function handleChanged(evt: any, data: { objIds: string[] }) {
    // Just reload the window if our issue question changed
    if (data.objIds.indexOf(publicationId) >= 0) {
      remote.getCurrentWindow().reload();
    }
  }

  useEffect(() => {
    ipcRenderer.on('publications-changed', handleChanged);
    return function cleanup() {
      ipcRenderer.removeListener('publications-changed', handleChanged);
    }
  }, []);


  /* Changed status mark */

  const modifiedPublications = useModified().publications;
  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false);

  useEffect(() => {
    const _hasUncommittedChanges = create || modifiedPublications.indexOf(publicationId) >= 0;
    setHasUncommittedChanges(_hasUncommittedChanges);
  }, [modifiedPublications]);


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
  };

  const ValidationErr = GenericValidationErrorsNotice as ValidationErrorsNotice<typeof validators>;

  const [validationErrors, setValidationErrors] = useState({} as ValidationErrors<ObjectValidators<Publication>>);
  const [canSave, setCanSave] = useState(false);


  /* Validation publication & write to storage (if applicable) when user makes edits */

  useEffect(() => {
    setCanSave(false);

    (async () => {
      const validationErrors = await validate(publication, validators);
      const canSave = Object.keys(validationErrors).length === 0;

      setCanSave(canSave);
      setValidationErrors(validationErrors);

      if (canSave && !create) {
        update(publication);
      }
    })();
  }, [JSON.stringify(publication)]);


  /* IPC helpers */

  async function update(publication: Publication) {
    await pubOperationQueue.acquire(SINGLETON_LOCK, async () => {
      const updateResult = await request<{ modified: boolean }>('publication-update', { pubId: publication.id, data: publication });
      setHasUncommittedChanges(updateResult.modified);
    });
  }

  async function commitAndClose() {
    if (!canSave) {
      return;
    }
    setCanSave(false);

    await pubOperationQueue.acquire(SINGLETON_LOCK, async () => {
      if (create) {
        await request<Publication>('publication-create', { data: publication });
      } else {
        await request<Publication>('publication-update', { pubId: publication.id, data: publication, commit: true });
      }
    });

    await ipcRenderer.send('remote-storage-trigger-sync');
    await ipcRenderer.send('publications-changed');
    await remote.getCurrentWindow().close();
  }

  return (
    <div className={styles.pubEditorWindow}>
      <PaneHeader
          className={styles.windowHeader}
          align="right"
          major={true}
          actions={<HelpButton path="amend-publication/" />}>
        <ObjectStorageStatus
          canSave={canSave}
          hasUncommittedChanges={hasUncommittedChanges}
          onCommit={commitAndClose} />
        service publication&nbsp;“<span className="object-id">{publication.id}</span>”

      </PaneHeader>

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
              <ul>
                <ValidationErr fieldName="title" validators={validators} errors={validationErrors} />
              </ul>
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

        <FormGroup key="url" label="Authoritative resource URL for this publication:">
          <InputGroup
            value={publication.url}
            type="url"
            large={true}
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              setPublication({
                ...publication,
                url:  (evt.target as HTMLInputElement).value as string,
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
    const pub = await request<Publication>('storage-read-one-in-publications', { objectId: id });
    console.debug("Got pub");
    return pub;
  } catch (e) {
    console.error(e);
    return null;
  }
}
