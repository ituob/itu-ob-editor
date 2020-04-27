import React, { useState } from 'react';
import { NonIdealState, Button, Icon, Tooltip, Position } from '@blueprintjs/core';

// import { getStatic } from 'sse/renderer/static';
// <img src={getStatic('itu-logo.png')} alt="ITU logo" className={styles.logo} />

import { callIPC } from 'coulomb/ipc/renderer';
import { WindowComponentProps } from 'coulomb/config/renderer';

import { conf } from 'app';

import { StorageStatus } from 'renderer/widgets/sync-status';
import { default as IssueScheduler } from '../issue-scheduler';
import { Browser as PublicationBrowser } from '../publication-browser';
//import { RecommendationBrowser } from '../recommendation-browser';
import * as styles from './styles.scss';


interface ContentTypeOptions {
  id: keyof typeof conf["data"],
  title: string,
  getIcon: () => JSX.Element,
  getBrowser?: () => JSX.Element,
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
            tooltipPosition={Position.RIGHT}
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