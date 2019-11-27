import AsyncLock from 'async-lock';
import { remote, ipcRenderer } from 'electron';

import React, { useContext, useState, useEffect } from 'react';
import { Button, FormGroup, InputGroup } from '@blueprintjs/core';

import { request } from 'sse/api/renderer';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { LangConfigContext } from 'sse/localizer/renderer';

import { Publication } from 'models/publications';
import { HelpButton } from 'renderer/widgets/help-button';

import * as styles from './styles.scss';


const pubOperationQueue = new AsyncLock();


interface PublicationEditorProps {
  publicationId: string,
  create: boolean,
}
export const PublicationEditor: React.FC<PublicationEditorProps> = function ({ publicationId, create }) {
  const lang = useContext(LangConfigContext);

  const [publication, setPublication] = useState({
    id: publicationId,
    url: '',
    recommendation: null,
    title: { [lang.default]: '' },
  } as Publication);

  const fieldRequirements: FieldRequirements<Publication> = {
    title: {
      specified: {
        err: `have a title in ${lang.available[lang.default]}`,
        didFail: async (pub) => (pub.title[lang.default] === ''),
      },
    },
    id: {
      unique: {
        err: `have a unique ID (“${publication.id}” is already taken)`,
        didFail: async (pub) => (create === true && (await get(pub.id)) !== null),
      },
      specified: {
        err: `have a unique string ID`,
        didFail: async (pub) => (pub.id.trim() === ''),
      },
    },
  };

  const UnmetReq = UnmetRequirementNotice as _UnmetRequirementNotice<typeof fieldRequirements>;

  const [canSave, setCanSave] = useState(false);
  const [unmetRequirements, setUnmetRequirements] = useState({} as UnmetRequirements<typeof fieldRequirements>);

  useEffect(() => {
    (async () => {
      const pub = await get(publication.id);
      if (pub) {
        setPublication(pub);
      }
    })();
  }, []);

  useEffect(() => {
    setCanSave(false);

    console.debug("Checking updated pub");
    pubOperationQueue.acquire('1', async () => {
      console.debug("Checking updated pub, acquired");
      const reqs = await getUnmetRequirements(publication, fieldRequirements);
      const canSave = Object.keys(unmetRequirements).length === 0;

      setCanSave(canSave);
      setUnmetRequirements(reqs);

      if (canSave && !create) {
        update(publication);
      }
    });
  }, [JSON.stringify(publication)]);


  async function update(publication: Publication) {
    await pubOperationQueue.acquire('1', async () => {
      await request<Publication>('publication-update', { pubId: publication.id, data: publication });
    });
  }

  async function commitAndClose() {
    if (!canSave) {
      return;
    }
    setCanSave(false);

    await pubOperationQueue.acquire('1', async () => {
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
      <PaneHeader major={true} actions={<HelpButton path="amend-publication/" />}>
        {create ? "Create" : "Edit"} publication
      </PaneHeader>

      <main className={styles.windowBody}>
        <FormGroup
            key="id"
            label="ID"
            intent={unmetRequirements.id ? "danger" : undefined}
            helperText={
              <ul>
                <UnmetReq field="id" reqSpec={fieldRequirements} unmetReqs={unmetRequirements} />
                <li>Use uppercase English string as publication ID: e.g., BUREAUFAX.</li>
                <li>Choose an ID consistent with publication URL on ITU website, if possible.</li>
                <li>Note: you can’t change this later easily.</li>
              </ul>
            }>
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

        <FormGroup
            key="title"
            intent={unmetRequirements.title ? "danger" : undefined}
            helperText={
              <ul>
                <UnmetReq field="title" reqSpec={fieldRequirements} unmetReqs={unmetRequirements} />
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
          disabled={canSave !== true}
          intent="success"
          icon="git-commit"
          onClick={commitAndClose}>Commit and Close</Button>
      </footer>
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


type UnmetRequirementNoticeProps<F extends FieldRequirements<any>> = {
  field: string & keyof F,
  reqSpec: F,
  unmetReqs: UnmetRequirements<F>,
}
type _UnmetRequirementNotice<F = FieldRequirements<any>> = React.FC<UnmetRequirementNoticeProps<F>>
const UnmetRequirementNotice: _UnmetRequirementNotice = function ({ field, reqSpec, unmetReqs }) {
  if (!reqSpec[field]) { throw new Error("Unknown requirements key"); }
  return <>
    {Object.keys(unmetReqs[field] || {}).
      map((checkName: string) => <li>Must {(reqSpec[field] as CheckSpecs<any>)[checkName].err}.</li>)}
  </>;
}


type CheckSpecs<O> = {
  [checkName: string]: {
    err: string,
    didFail: (obj: O) => Promise<boolean>,
  }
}

type FieldRequirements<O> = {
  [F in keyof O]?: CheckSpecs<O>
};


type UnmetRequirements<R extends FieldRequirements<any>> = {
  [F in keyof R]?: {
    [C in keyof R[F]]?: boolean
  }
};


async function getUnmetRequirements<O>(obj: O, reqSpec: FieldRequirements<O>): Promise<UnmetRequirements<FieldRequirements<O>>> {
  var reqs: UnmetRequirements<FieldRequirements<O>> = {};

  for (const [field, checks] of Object.entries(reqSpec)) {
    for (const [checkName, checkSpec] of Object.entries(checks as CheckSpecs<O>)) {
      if (await checkSpec.didFail(obj)) {
        reqs[field as keyof O] = { ...reqs[field as keyof O], [checkName]: false };
      }
    }
  }

  return reqs;
}
