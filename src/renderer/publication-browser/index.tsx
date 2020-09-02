import React from 'react';
import { H5 } from '@blueprintjs/core';
import { SimpleEditableCard } from '@riboseinc/coulomb/renderer/widgets/editable-card-list';
import { PublicationTitle } from 'renderer/widgets/publication-title';
import * as styles from './styles.scss';
import { app } from 'renderer/index';
import { Publication } from 'models/publications';


export const Browser: React.FC<{}> = function () {
  const publications = app.useMany<Publication>('publications').objects;

  return <div className={styles.objectList}>
    {Object.values(publications).map(pub =>
      <SimpleEditableCard
          extended={true}
          key={pub.id} onClick={() => app.openObjectEditor('publications', pub.id)}
          contentsClassName={styles.headerLabel}
          className={styles.pubCard}>
        <H5 className={styles.pubTitle}><PublicationTitle id={pub.id} /></H5>
        <span className={styles.pubId}>{pub.id}</span>
      </SimpleEditableCard>
    )}
  </div>
};
