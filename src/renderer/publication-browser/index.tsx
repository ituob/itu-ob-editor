import React from 'react';
import { H5 } from '@blueprintjs/core';
import { openWindow } from 'sse/api/renderer';
import { SimpleEditableCard } from 'sse/renderer/widgets/editable-card-list';
import { PublicationTitle } from 'renderer/widgets/publication-title';
import { useStorage } from 'storage/renderer';
import * as styles from './styles.scss';


export const Browser: React.FC<{}> = function () {
  const publications = useStorage().publications;

  return <div className={styles.objectList}>
    {Object.values(publications).map(pub =>
      <SimpleEditableCard
          extended={true}
          key={pub.id} onClick={() => openWindow('publication-editor', { pubId: pub.id })}
          contentsClassName={styles.headerLabel}
          className={styles.pubCard}>
        <H5 className={styles.pubTitle}><PublicationTitle id={pub.id} /></H5>
        <span className={styles.pubId}>{pub.id}</span>
      </SimpleEditableCard>
    )}
  </div>
};
