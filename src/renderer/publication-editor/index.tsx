import AsyncLock from 'async-lock';
import * as jsondiffpatch from 'jsondiffpatch';
import { remote, ipcRenderer } from 'electron';

import React, { useContext, useState, useEffect } from 'react';
import { NonIdealState, Spinner, IconName } from '@blueprintjs/core';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { Trans } from 'coulomb/localizer/renderer/widgets';
import { WindowComponentProps } from 'coulomb/config/renderer';
import { callIPC } from 'coulomb/ipc/renderer';
import { SimpleEditableCard, AddCardTrigger } from 'coulomb/renderer/widgets';

import { Publication } from 'models/publications';
import { app } from 'renderer/index';
import { HelpButton } from 'renderer/widgets/help-button';
import { ObjectStorageStatus } from 'renderer/widgets/change-status';
import {
  ObjectValidators,
  ValidationErrors,
  validate,
} from 'renderer/form-validation';

import { EditorViewProps } from './types';
import { default as EditPublicationMeta } from './meta';
import { default as EditDatasetMeta } from './dataset';
import * as styles from './styles.scss';
import { ItemList } from 'renderer/widgets/item-list';
import { Dataset } from 'models/dataset';
import { PaneHeader } from 'coulomb/renderer/widgets';


const pubOperationQueue = new AsyncLock();
const SINGLETON_LOCK = 'singletonLock';


interface PublicationEditorView {
  id: string
  title: JSX.Element

  component?: React.FC<EditorViewProps<Publication>>
  // Missing component would make this item a non-clickable header.

  disabled?: true
  icon?: IconName
}


function getPublicationStub(defaultLang: string, publicationID: string): Publication {
  return {
    id: publicationID,
    url: '',
    recommendation: null,
    title: { [defaultLang]: '' },
    datasets: {},
  };
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
    const pub = _publication.object || getPublicationStub(lang.default, publicationID);
    return <PublicationEditor publication={pub} create={create} />;
  }
}


interface PublicationEditorProps {
  publication: Publication
  create: boolean 
}
const PublicationEditor: React.FC<PublicationEditorProps> = function (props) {
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

  const metaSections: PublicationEditorView[] = [
    ...META_SECTIONS,
    ...(create
      ? []
      : [{ id: 'delete', title: <>Delete publication</>, component: DeletePublication, icon: 'delete' as IconName }]),
  ];

  type SectionIDs = string & ((typeof metaSections[number])["id"] | (keyof (typeof publication)["datasets"]));
  const [selectedSection, selectSection] = useState<SectionIDs>(DEFAULT_SECTION_ID);

  const sectionNavigation = <>
    <PaneHeader minor align="left">Publication settings</PaneHeader>
    {metaSections.map(s =>
      <SimpleEditableCard minimal
          icon={s.icon}
          selected={selectedSection === s.id}
          onSelect={() => selectSection(s.id)}>
        {s.title}
      </SimpleEditableCard>
    )}

    <ItemList
      title="Dataset settings"
      items={publication.datasets || {}}
      onSelect={(idx) => selectSection(`dataset-${idx}`)}
      onDelete={(idx) => {
        var newPub = JSON.parse(JSON.stringify(publication));
        if (newPub.datasets[idx]) {
          delete newPub.datasets[idx];
        }
        if (selectedSection === `dataset-${idx}`) {
          selectSection(DEFAULT_SECTION_ID);
        }
        setPublication(newPub);
      }}
      selectedIdx={selectedSection.indexOf('dataset-') === 0
        ? selectedSection.replace('dataset-', '')
        : undefined}
      itemIcon={(item) => (item as Dataset).type === 'index' ? 'database' : 'th'}
      prompt={(highlight) =>
        <AddCardTrigger
          highlight={highlight}
          label="Add dataset"
          onClick={() => {
            setPublication({
              ...publication,
              datasets: {
                ...(publication.datasets || {}),
                [`data_${Object.keys(publication.datasets || {}).length + 1}`]:
                  { type: 'array', item: { type: 'object', fields: [] } },
              }});
          }}
        />
      }
      itemTitle={(item: unknown, idx: string) => ((item as Dataset)?.title || '') !== ''
        ? <Trans what={(item as Dataset).title!} />
        : <>Dataset {idx}</>}
    />
  </>;


  /* Section view */

  let selectedSectionView: JSX.Element;
  const PublicationMetaEditor: React.FC<EditorViewProps<Publication>> | undefined =
    metaSections.find(s => s.id === selectedSection)?.component;

  if (selectedSection.startsWith('dataset-')) {
    const datasetID = selectedSection.replace('dataset-', '');
    const dataset = (publication.datasets || {})[datasetID];
    if (dataset !== undefined) {
      selectedSectionView = <EditDatasetMeta
        onChange={(newDataset) => {
          setPublication({
            ...publication,
            datasets: {
              ...(publication.datasets || {}),
              [datasetID]: newDataset
            }
          });
        }}
        obj={dataset} />;
    } else {
      selectedSectionView = <NonIdealState
        title="Nothing to show"
        description="Please select a settings pane or a dataset on the left." />;
    }

  } else if (PublicationMetaEditor !== undefined) {
    selectedSectionView = <PublicationMetaEditor
      obj={publication}
      create={create}
      validators={validators}
      validationErrors={validationErrors}
      onChange={setPublication} />;

  } else {
    selectedSectionView = <NonIdealState
      icon="heart-broken"
      title="Unable to locate editor class" />;
  }


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


const DeletePublication: React.FC<EditorViewProps<Publication>> =
function ({ obj, onChange }) {
  return <NonIdealState
    icon="help"
    title="This functionality is temporarily unavailable"
    description="Please contact the development team for assistance in removing publicatons." />;
};


const META_SECTIONS: PublicationEditorView[] = [
  { id: 'identifiers', title: <>Identifiers</>, component: EditPublicationMeta, icon: 'numerical' },
];

const DEFAULT_SECTION_ID = META_SECTIONS[0].id;


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