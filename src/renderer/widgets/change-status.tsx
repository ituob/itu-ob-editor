import React from 'react';
import { Tooltip, Button, Icon } from '@blueprintjs/core';

import * as styles from './change-status.scss';


interface ObjectStorageStatusProps {
  haveSaved?: boolean,
  doneButtonLabel?: string,
  canSave?: boolean,
  onCommit: () => Promise<void>,
}
export const ObjectStorageStatus: React.FC<ObjectStorageStatusProps> =
function ({ canSave, haveSaved, doneButtonLabel, onCommit }) {
  /* Shows an icon showing save is in progress, or commit button if applicable. */

  let changeStatus: JSX.Element;
  let tooltipText: string;

  if (haveSaved === false) {
    changeStatus = <Button
        intent="success"
        onClick={onCommit}
        icon="git-commit"
        disabled={canSave === false}
        small={true}>
      {doneButtonLabel || 'Done'}
    </Button>;
    tooltipText = "Click to commit changes";

  } else {
    changeStatus = <Icon icon="tick-circle" intent="success" />
    tooltipText = "Edition is up-to-date";
  }

  return (
    <Tooltip className={styles.statusIcon} content={tooltipText}>
      {changeStatus}
    </Tooltip>
  );
};
