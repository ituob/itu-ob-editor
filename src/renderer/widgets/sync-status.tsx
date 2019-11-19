import { ipcRenderer } from 'electron';

import React, { useState, useEffect, useContext } from 'react';
import { Text, Icon, IconName, Spinner } from '@blueprintjs/core';

import { LocalStorageStatusContext } from 'renderer/sync-context';
import { RemoteStorageStatus, PartialRemoteStorageStatus } from 'remote-storage';

import * as styles from './sync-status.scss';


export const StorageStatus: React.FC<{ className?: string }> = function ({ className }) {
  const local = useContext(LocalStorageStatusContext);

  const [remote, updateRemote] = useState({
    isOffline: false,
    hasLocalChanges: false,
    isPushing: false,
    lastPushSucceeded: undefined,
    isAheadOfUpstream: false,
    upstreamIsAhead: false,
  } as RemoteStorageStatus);

  useEffect(() => {
    ipcRenderer.on('remote-storage-status', handleStorageStatusUpdate);
    return function cleanup() {
      ipcRenderer.removeListener('remote-storage-status', handleStorageStatusUpdate);
    };
  }, []);

  function handleStorageStatusUpdate(evt: any, remoteStatus: PartialRemoteStorageStatus) {
    console.debug("Got status update", remoteStatus);
    updateRemote({ ...remote, ...remoteStatus });
  }

  let localStorageIcon: JSX.Element;
  const failedOps = local.getFailedOperations();
  const opsInProgress = local.getOperationsInProgress();
  const successfulOps = local.getSuccessfulOperations();
  const queuedOps = local.getQueuedOperations();

  if (opsInProgress.length > 0) {
    localStorageIcon = <Spinner size={Spinner.SIZE_SMALL} intent="primary" />;
  } else if (local.isDirty || queuedOps.length > 0) {
    console.debug(queuedOps);
    localStorageIcon = <Icon icon="edit" intent="warning" />;
  } else if (failedOps.length > 0) {
    localStorageIcon = <Icon icon="warning-sign" intent="danger" />;
  } else {
    localStorageIcon = <Icon icon="saved" intent="success" />;
  }

  let status: JSX.Element | null;
  if (failedOps.length > 0) {
    const lastOp = failedOps[failedOps.length - 1];
    if (lastOp) {
      status = <><Text ellipsize={true}>${lastOp.description}</Text>: Failed to save</>;
    } else {
      status = <>Error saving</>;
    }
  } else if (opsInProgress.length > 0) {
    status = <>Saving…</>;
  } else if (local.isDirty || queuedOps.length > 0) {
    status = null;
  } else if (successfulOps.length > 0) {
    const lastOp = successfulOps[successfulOps.length - 1];
    if (lastOp) {
      status = <><Text ellipsize={true}>{lastOp.description}</Text>: Saved</>
    } else {
      status = <>Saved</>;
    }
  } else {
    status = null;
  }

  let remoteStorageIcon: IconName;
  if (remote.isOffline) {
    remoteStorageIcon = "offline";
  } else if (remote.hasLocalChanges) {
    remoteStorageIcon = "edit"
  } else if (remote.isPushing) {
    remoteStorageIcon = "cloud-upload"
  } else if (!remote.lastPushSucceeded) {
    remoteStorageIcon = "warning-sign"
  } else if (remote.upstreamIsAhead) {
    remoteStorageIcon = "outdated";
  } else {
    remoteStorageIcon = "updated";
  }

  return <div className={`${styles.storageStatusBase} ${className}`}>
    {localStorageIcon}
    {status}
    <Icon icon={remoteStorageIcon} />
  </div>;
};
