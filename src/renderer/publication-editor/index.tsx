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

  const [isNew, setIsNew] = useState(true);

  const save = async () => {
    const result = await apiRequest<Publication>(
      'storage-publications',
      JSON.stringify({ objectId: publicationId }),
      JSON.stringify(publication));
    console.debug("Saved successfully", result);
    await load();
  };

  const load = async () => {
    const result = await apiRequest<Publication>(
      'storage-publications',
      JSON.stringify({ objectId: publicationId }));
    if (result !== null) {
      setIsNew(false);
      setPublication(result);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className={styles.pubEditorWindow}>
      <PaneHeader align="right">{isNew ? "Create" : "Edit"} publication</PaneHeader>

      <main className={styles.windowBody}>
        <FormGroup
            key="id"
            label="ID"
            helperText={
              <ul>
                <li>Use uppercase English string as publication ID: e.g., BUREAUFAX.</li>
                <li>Choose an ID consistent with publication URL on ITU website, if possible.</li>
                <li>Note: you can’t change this later easily.</li>
              </ul>
            }>
          <InputGroup
            value={publicationId}
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

        <FormGroup key="title" label={`Title in ${lang.available[lang.default]}`}>
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
          disabled={(publication.title[lang.default] || '') === ''}
          intent="success"
          onClick={save}>Save</Button>
      </footer>
    </div>
  );
}
