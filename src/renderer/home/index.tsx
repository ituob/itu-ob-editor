import React, { useState, useContext, useEffect } from 'react';
import { NonIdealState, Button, Icon, Tooltip, Position } from '@blueprintjs/core';

import { callIPC } from '@riboseinc/coulomb/ipc/renderer';
import { WindowComponentProps } from '@riboseinc/coulomb/config/renderer';
import { SingleDBStatusContext } from '@riboseinc/coulomb/db/renderer/single-db-status-context-provider';
import { DBSyncScreen } from '@riboseinc/coulomb/db/isogit-yaml/renderer/status';

import { conf } from 'app';

import { StorageStatus } from 'renderer/widgets/sync-status';
import { default as IssueScheduler } from '../issue-scheduler';
import { Browser as PublicationBrowser } from '../publication-browser';
import * as styles from './styles.scss';


interface ContentTypeOptions {
  id: keyof typeof conf["data"]
  title: string
  getIcon: () => JSX.Element
  getBrowser?: () => JSX.Element
}

type ContentTypeOptionSet = ContentTypeOptions[];


const contentTypes: ContentTypeOptionSet = [
  {
    id: 'issues',
    title: 'OB editions',
    getIcon: () => <Icon icon="projects" />,
    getBrowser: () => <IssueScheduler />,
  },
  {
    id: 'publications',
    title: 'Service publications',
    getIcon: () => <Icon icon="th" />,
    getBrowser: () => <PublicationBrowser />,
  },
  {
    id: 'recommendations',
    title: 'Recommendations',
    getIcon: () => <Icon icon="manual" />,
  },
];


const Window: React.FC<WindowComponentProps> = function () {

  const [selectedCType, selectCType] = useState('issues' as keyof typeof conf["data"]);

  // START DB SYNC SCREEN

  const db = useContext(SingleDBStatusContext);

  const [syncScreenRequested, requestSyncScreen] = useState(false);

  useEffect(() => {
    const showInitializationScreen = (
      db?.status === undefined ||
      db.status.needsPassword ||
      db.status.isPushing ||
      db.status.isPulling ||
      db.status.isOnline !== true ||
      db.status.lastSynchronized === null);

    if (showInitializationScreen) {
      requestSyncScreen(true);
    }

  }, [JSON.stringify(db)]);

  const handleRequestSync = async () => {
    requestSyncScreen(true);
    await callIPC('db-default-git-request-push');
    await callIPC('db-default-git-trigger-sync');
  };

  if (db === null) {
    return <NonIdealState title="Preparing DB synchronization…" />;
  } else if (syncScreenRequested) {
    return <DBSyncScreen
      onDismiss={() => requestSyncScreen(false)}
      dbName="default"
      db={db} />;
  }

  // END SYNC SCREEN

  const cTypeOptions = contentTypes.find(cType => cType.id === selectedCType);

  let viewer: JSX.Element;
  if (cTypeOptions !== undefined && cTypeOptions.getBrowser) {
    viewer = cTypeOptions.getBrowser();
  } else {
    viewer = <NonIdealState
      icon="widget"
      title="Not found"
      description={`Object browser for content type “${selectedCType}” has not been implemented yet. Sorry!`}
    />;
  }

  return (
    <div className={styles.homeWindow}>
      {viewer}

      <div className={styles.dataBar}>
        <div className={styles.contentTypes}>
          {contentTypes.map(cType => (
            <DataBarButton
                title={cType.title}
                buttonClassName={cType.id === selectedCType ? styles.selectedCType : undefined}
                onClick={() => selectCType(cType.id)}>
              {cType.getIcon()}
            </DataBarButton>
          ))}
        </div>

        <div className={styles.status}>
          <DataBarButton
              onClick={() => callIPC('open-predefined-window', { id: 'settings' })}
              title="Settings">
            <Icon icon="settings" />
          </DataBarButton>

          <StorageStatus
            onRequest={handleRequestSync}
            iconClassName={styles.storageStatusIcon} />
        </div>
      </div>
    </div>
  );
};


const DataBarButton: React.FC<{ onClick: () => void, buttonClassName?: string, title: string }> = function ({ onClick, buttonClassName, title, children }) {
  return (
    <div className={styles.dataBarButtonWithTooltip}>
      <Tooltip content={title} position={Position.RIGHT}>
        <Button
            large={true}
            title={title}
            minimal={true}
            className={buttonClassName}
            onClick={onClick}>
          {children}
        </Button>
      </Tooltip>
    </div>
  );
};


export default Window;
