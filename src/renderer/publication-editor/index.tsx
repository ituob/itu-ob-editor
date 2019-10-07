import React, { useContext, useState, useEffect } from 'react';
import { Button, FormGroup, InputGroup } from '@blueprintjs/core';

import { apiRequest } from 'sse/api/renderer';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { LangConfigContext } from 'sse/localizer/renderer';

import { Publication } from 'models/publications';

import * as styles from './styles.scss';


interface PublicationEditorProps {
  publicationId: string,
}
export const PublicationEditor: React.FC<PublicationEditorProps> = function ({ publicationId }) {
  const lang = useContext(LangConfigContext);

  const [publication, setPublication] = useState({
    id: publicationId,
    url: '',
    recommendation: null,
    title: { [lang.default]: '' },
  } as Publication);

  const fieldRequirements = {
    title: {
      specified: `have a title in ${lang.available[lang.default]}`,
    },
    id: {
      unique: `have a unique ID (“${publication.id}” is already taken)`,
      specified: `have a unique string ID`,
    },
  };

  type UnmetRequirements = {
    [F in keyof typeof fieldRequirements]?: {
      [R in keyof (typeof fieldRequirements)[F]]?: boolean
    }
  };

  const [isNew, setIsNew] = useState(true);
  const [canSave, setCanSave] = useState(false);
  const [unmetRequirements, setUnmetRequirements] = useState({} as UnmetRequirements);

  useEffect(() => { load(); }, []);

  useEffect(() => { setCanSave(Object.keys(unmetRequirements).length === 0); }, [unmetRequirements]);

  useEffect(() => {
    setCanSave(false);
    (async () => {
      const reqs = await getUnmetRequirements();
      setUnmetRequirements(reqs);
    })();
  }, [isNew, publication.id, publication.title]);

  async function getUnmetRequirements() {
    var result: UnmetRequirements = {};

    if (publication.title[lang.default] === '') {
      result['title'] = { ...result.title, specified: false };
    }

    if (publication.id === '') {
      result['id'] = { ...result.id, specified: false };
    } else if (isNew) {
      const alreadyExists = (await get(publication.id)) !== null;
      if (alreadyExists) {
        result['id'] = { ...result.id, unique: false };
      }
    }

    return result;
  }

  async function save() {
    await apiRequest<Publication>(
      'storage-publications',
      JSON.stringify({ objectId: publication.id }),
      JSON.stringify(publication));
    await load();
  }

  async function load() {
    const result = await get(publication.id);
    if (result !== null) {
      setIsNew(false);
      setPublication(result);
    }
  }

  return (
    <div className={styles.pubEditorWindow}>
      <PaneHeader align="right">{isNew ? "Create" : "Edit"} publication</PaneHeader>

      <main className={styles.windowBody}>
        <FormGroup
            key="id"
            label="ID"
            intent={unmetRequirements.id ? "danger" : undefined}
            helperText={
              <ul>
                {unmetRequirements.id
                  ? Object.keys(unmetRequirements.id).map(msgId => <li>Must {fieldRequirements.id[msgId as keyof typeof fieldRequirements.id]}.</li>)
                  : ''}
                <li>Use uppercase English string as publication ID: e.g., BUREAUFAX.</li>
                <li>Choose an ID consistent with publication URL on ITU website, if possible.</li>
                <li>Note: you can’t change this later easily.</li>
              </ul>
            }>
          <InputGroup
            value={publication.id}
            type="text"
            large={true}
            readOnly={!isNew}
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              setPublication({
                ...publication,
                id: (evt.target as HTMLInputElement).value as string,
              });
            }}
          />
        </FormGroup>

        <FormGroup
            key="title"
            intent={unmetRequirements.title ? "danger" : undefined}
            helperText={
              <ul>
                {unmetRequirements.title
                  ? Object.keys(unmetRequirements.title).map(msgId => <li>Must {fieldRequirements.title[msgId as keyof typeof fieldRequirements.title]}.</li>)
                  : ''}
              </ul>
            }
            label={`Title in ${lang.available[lang.default]}`}>
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

        <FormGroup key="url" label="URL">
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

      <footer className={styles.actionButtons}>
        <Button
          large={true}
          disabled={canSave !== true}
          intent="success"
          onClick={save}>Save</Button>
      </footer>
    </div>
  );
};


async function get(id: string) {
  return await apiRequest<Publication>('storage-publications', JSON.stringify({ objectId: id }));
}
