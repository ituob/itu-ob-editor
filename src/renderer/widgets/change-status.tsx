import React from 'react';
import { Button, ButtonGroup, IconName, Intent } from '@blueprintjs/core';

import * as styles from './change-status.scss';
import { PaneHeader } from '@riboseinc/coulomb/renderer/widgets';
import { PaneHeaderProps } from '@riboseinc/coulomb/renderer/widgets/pane-header';


interface ObjectStorageStatusProps {
  objectType: string
  objectID: string | number
  haveSaved?: boolean
  doneButtonLabel?: string
  canSave?: boolean
  onCommit: () => Promise<void>
  paneHeaderProps?: Partial<PaneHeaderProps>
}
export const ObjectStorageStatus: React.FC<ObjectStorageStatusProps> =
function ({ objectType, objectID, canSave, haveSaved, doneButtonLabel, onCommit, paneHeaderProps }) {
  /* Shows an icon showing save is in progress, or commit button if applicable. */

  let tooltipText: string;
  let intent: Intent | undefined;
  let icon: IconName | undefined;
  if (canSave === false) {
    tooltipText = "Cannot save new version—please check entered data";
    intent = undefined;
    icon = "warning-sign";
  } else if (haveSaved === false) {
    tooltipText = "Click to save & commit new version";
    intent = undefined;
    icon = undefined;
  } else {
    tooltipText = "Object is up-to-date";
    intent = undefined;
    icon = "tick-circle"
  }

  const actions = (
    <>
      <ButtonGroup fill>
        <Button
            intent={intent}
            onClick={onCommit}
            icon="git-commit"
            rightIcon={icon}
            disabled={canSave === false || haveSaved === true}
            title={tooltipText}>
          {doneButtonLabel || "Commit"}
        </Button>
      </ButtonGroup>
      {paneHeaderProps?.actions}
    </>
  );

  return (
    <div className={styles.paneHeader}>
      <PaneHeader
          align="left"
          {...(paneHeaderProps || {})}
          actions={actions}>
        {objectType}/<span className="object-id">{objectID}</span>
      </PaneHeader>
    </div>
  );
};
