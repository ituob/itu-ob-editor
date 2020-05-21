import AsyncLock from 'async-lock';
import * as jsondiffpatch from 'jsondiffpatch';
import { remote, ipcRenderer } from 'electron';

import React, { useContext, useState, useEffect } from 'react';
import { NonIdealState, Spinner, IconName } from '@blueprintjs/core';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { WindowComponentProps } from 'coulomb/config/renderer';
import { callIPC } from 'coulomb/ipc/renderer';
import { SimpleEditableCard } from 'coulomb/renderer/widgets/editable-card-list';

import { Publication } from 'models/publications';
import { app } from 'renderer/index';
import { HelpButton } from 'renderer/widgets/help-button';
import { ObjectStorageStatus } from 'renderer/widgets/change-status';
import {
  ObjectValidators,
  ValidationErrors,
  validate,
} from 'renderer/form-validation';

import { PublicationEditorViewProps } from './types';
import { default as EditPublicationMeta } from './meta';
import * as styles from './styles.scss';


const pubOperationQueue = new AsyncLock();
const SINGLETON_LOCK = 'singletonLock';


interface PublicationEditorView {
  id: string
  title: string
  component: React.FC<PublicationEditorViewProps>
  icon?: IconName
}


const Window: React.FC<WindowComponentProps> = function ({ query }) {
  const publicationID = query.get('objectID') || '';
  const create = query.get('create') ? true : false;

  /* Load publication at start */

  const _publication = app.useOne<Publication, string>('publications', publicationID);

  const lang = useContext(LangConfigContext);

  /* Reload window if publication changed from outside */

  useEffect(() => {
    ipcRenderer.on('model-publications-objects-changed', handleChanged);
    return function cleanup() {
      ipcRenderer.removeListener('model-publications-objects-changed', handleChanged);
    }
  }, []);

  function handleChanged(evt: any, data: { ids: string[] }) {
    // Just reload the window if our publication changed
    if (!create && data.ids.indexOf(publicationID) >= 0) {
      remote.getCurrentWindow().reload();
    }
  }

  if (!create && !_publication.object) {
    return <NonIdealState
      icon={<Spinner />}
      title="No publication to show"
      description="If you’re still seeing this, this might mean the publication failed to load." />;
  } else {
    const pub = _publication.object || {
      id: publicationID,
      url: '',
      recommendation: null,
      title: { [lang.default]: '' },
    };
    return <PublicationEditor publication={pub} create={create} />;
  }
}


const PublicationEditor: React.FC<{ publication: Publication, create: boolean }> = function (props) {
  const lang = useContext(LangConfigContext);
  const create = props.create;

  const [publication, setPublication] = useState<Publication>(props.publication);

  useEffect(() => {
    const pub = props.publication;
    if (pub) { setPublication(pub); }
  }, [props.publication]);


  /* Changed status mark */

  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false);

  /* Validation */

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

  const [validationErrors, setValidationErrors] =
  useState<ValidationErrors<typeof validators>>({});

  const [canSave, setCanSave] = useState(false);

  useEffect(() => {
    setCanSave(false);

    (async () => {
      const validationErrors = await validate(publication, validators);
      const canSave = Object.keys(validationErrors).length === 0;

      setCanSave(canSave);
      setValidationErrors(validationErrors);

      setHasUncommittedChanges(jsondiffpatch.diff(props.publication, publication) !== undefined);
    })();
  }, [publication]);


  /* Section navigation */

  let sections: PublicationEditorView[];
  if (!create) {
    sections = [
      ...META_SECTIONS,
      { id: 'delete', title: "Delete publication", component: DeletePublication, icon: 'delete' },
    ];
  } else {
    sections = META_SECTIONS;
  }

  const [selectedSection, selectSection] = useState<(typeof sections[number])["id"] | null>('meta');

  const sectionNavigation = sections.map(s =>
    <SimpleEditableCard minimal
        icon={s.icon}
        selected={selectedSection === s.id}
        onSelect={() => selectSection(s.id)}>
      {s.title}
    </SimpleEditableCard>
  );


  /* Section view */

  const SelectedSectionComponent: React.FC<PublicationEditorViewProps> | null =
      selectedSection !== null
    ? (sections.find(s => s.id === selectedSection)?.component || null)
    : null;

  const selectedSectionView: JSX.Element | null = SelectedSectionComponent
    ? <SelectedSectionComponent
        onChange={setPublication}
        create={create}
        validators={validators}
        validationErrors={validationErrors}
        publication={publication} />
    : null;


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
      <div className={styles.navSidebar}>
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

        <div className={styles.paneBody}>
          {sectionNavigation}
        </div>
      </div>

      <div className={styles.windowBody}>
        {selectedSectionView}
      </div>
    </div>
  );
};


const DeletePublication: React.FC<PublicationEditorViewProps> = function ({ publication, onChange }) {
  return <NonIdealState
    icon="help"
    title="This functionality is temporarily unavailable"
    description="Please contact the development team for assistance in removing publicatons." />;
};


const META_SECTIONS: PublicationEditorView[] = [
  { id: 'meta', title: "Settings", component: EditPublicationMeta, icon: 'numerical' },
];


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