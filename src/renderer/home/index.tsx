import React, { useState } from 'react';
import { NonIdealState, Button, Icon, Tooltip, Position } from '@blueprintjs/core';

// import { getStatic } from 'sse/renderer/static';
// <img src={getStatic('itu-logo.png')} alt="ITU logo" className={styles.logo} />

import { Storage as BaseStorage } from 'sse/storage';
import { openWindow } from 'sse/api/renderer';

import { Storage } from 'storage';
import { StorageStatus } from 'renderer/widgets/sync-status';
import { IssueScheduler } from '../issue-scheduler';
import { Browser as PublicationBrowser } from '../publication-browser';
//import { RecommendationBrowser } from '../recommendation-browser';
import * as styles from './styles.scss';


interface ContentTypeOptions<S extends BaseStorage> {
  id: keyof S,
  title: string,
  getIcon: () => JSX.Element,
  getBrowser?: () => JSX.Element,
}

type ContentTypeOptionSet<S extends BaseStorage> = ContentTypeOptions<S>[];


const contentTypes: ContentTypeOptionSet<Storage> = [
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


interface HomeScreenProps {}
export const HomeScreen: React.FC<HomeScreenProps> = function () {
  
  const [selectedCType, selectCType] = useState('issues' as keyof Storage);

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
              onClick={() => openWindow('settings')}
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
