import React, { useState } from 'react';
import { Button } from '@blueprintjs/core';

import * as styles from './sync-status.scss';


interface StorageStatusProps {
  className?: string
  iconClassName?: string
  onRequest: () => void
}
export const StorageStatus: React.FC<StorageStatusProps> =
function ({ className, iconClassName, onRequest }) {
  const [canRequestSync, setCanRequestSync] = useState(true);

  async function triggerStorageSync() {
    setCanRequestSync(false);
    onRequest();
    setTimeout((() => setCanRequestSync(true)), 2000);
  }

  return <div className={`${styles.storageStatusBase} ${className || ''}`}>
    <Button
      icon="refresh"
      title="Synchronize (push and fetch changes)"
      onClick={triggerStorageSync}
      disabled={!canRequestSync}
      intent="success"
      large
      className={`${styles.statusIcon} ${iconClassName || ''}`}
    />
  </div>;
};
