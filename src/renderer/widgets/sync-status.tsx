import { ipcRenderer } from 'electron';
import { openWindow } from 'sse/api/renderer';

import React, { useState, useEffect } from 'react';
import { Button, IconName, Tooltip, FormGroup, InputGroup, Intent, Icon, Popover, Position } from '@blueprintjs/core';

import { RemoteStorageStatus } from 'sse/storage/main/remote';
import { request } from 'sse/api/renderer';

import { useModified } from 'renderer/workspace-context';

import * as styles from './sync-status.scss';


type AnyIDType = string | number;


interface StorageStatusProps {
  className?: string,
  iconClassName?: string,
  tooltipPosition?: Position,
}
export const StorageStatus: React.FC<StorageStatusProps> = function ({ className, iconClassName, tooltipPosition }) {
  const [remote, updateRemote] = useState({
    isMisconfigured: false,
    isOffline: false,
    hasLocalChanges: false,
    needsPassword: false,
    isPushing: false,
    isPulling: false,
    statusRelativeToLocal: undefined,
  } as RemoteStorageStatus);

  const modifiedIds = useModified();
  const hasModifiedItems = Object.values(modifiedIds).
    reduce((acc, val) => { return [ ...acc, ...Object.keys(val) ] }, [] as AnyIDType[]).length > 0;

  useEffect(() => {
    triggerInitialStorageSync();

    ipcRenderer.once('app-loaded', triggerInitialStorageSync);
    ipcRenderer.on('remote-storage-status', handleStorageStatusUpdate);

    return function cleanup() {
      ipcRenderer.removeListener('app-loaded', triggerInitialStorageSync);
      ipcRenderer.removeListener('remote-storage-status', handleStorageStatusUpdate);
    };
  }, []);

  const [passwordPromptIsOpen, openPasswordPrompt] = useState(false);

  useEffect(() => {
    openPasswordPrompt(remote.needsPassword);
  }, [remote.needsPassword]);

  useEffect(() => {
    if (remote.hasLocalChanges && !hasModifiedItems) {
      ipcRenderer.send('remote-storage-discard-all');
    }
  }, [remote.hasLocalChanges, hasModifiedItems]);

  async function triggerInitialStorageSync() {
    await ipcRenderer.send('remote-storage-trigger-sync');
  }

  function handleStorageStatusUpdate(evt: any, remoteStatus: Partial<RemoteStorageStatus>) {
    updateRemote(remote => ({ ...remote, ...remoteStatus }));
  }

  let statusIcon: IconName;
  let tooltipText: string | undefined;
  let statusIntent: Intent;
  let action: null | (() => void);

  if (remote.isMisconfigured) {
    statusIcon = "error";
    tooltipText = "Failed to synchronize—click to open settings";
    statusIntent = "danger";
    action = () => openWindow('settings');

  } else if (remote.isOffline) {
    statusIcon = "offline";
    tooltipText = "No Internet connection—click to retry";
    statusIntent = "danger";
    action = () => ipcRenderer.send('remote-storage-trigger-sync');

  } else if (remote.needsPassword) {
    statusIcon = "lock";
    tooltipText = "Please enter your password for online sync";
    statusIntent = "primary";
    action = null;

  } else if (remote.hasLocalChanges) {
    statusIcon = "asterisk";
    tooltipText = "Uncommitted changes present—click to resolve";
    statusIntent = "warning";
    action = () => openWindow('batch-commit');

  } else if (remote.isPulling) {
    statusIcon = "cloud-download"
    tooltipText = "Synchronizing changes…";
    statusIntent = "primary";
    action = null;

  } else if (remote.isPushing) {
    statusIcon = "cloud-upload"
    tooltipText = "Synchronizing changes…";
    statusIntent = "primary";
    action = null;

  } else if (remote.statusRelativeToLocal === 'diverged') {
    statusIcon = "outdated"
    tooltipText = "Diverging changes present—click to retry";
    statusIntent = "danger";
    action = () => ipcRenderer.send('remote-storage-trigger-sync');

  } else if (remote.statusRelativeToLocal === 'behind') {
    statusIcon = "cloud-upload"
    tooltipText = "Pending changes to upload";
    statusIntent = "warning";
    action = null;

  } else {
    statusIcon = "updated"
    tooltipText = undefined;
    statusIntent = "success";
    action = null;
  }

  return <div className={`${styles.storageStatusBase} ${className || ''}`}>
    <Popover minimal={true} content={<PasswordPrompt onConfirm={() => openPasswordPrompt(false)} />} position={tooltipPosition} isOpen={passwordPromptIsOpen}>
      <Tooltip position={tooltipPosition} intent={statusIntent} content={tooltipText}>
        {action !== null
          ? <Button
              className={`${styles.statusIcon} ${iconClassName || ''}`}
              icon={statusIcon}
              large={true}
              onClick={action}
              intent={statusIntent} />
          : <Icon
              icon={statusIcon}
              intent={statusIntent}
              className={`${styles.statusIcon} ${iconClassName || ''}`}
              iconSize={Icon.SIZE_LARGE} />}
      </Tooltip>
    </Popover>
  </div>;
};


const PasswordPrompt: React.FC<{ onConfirm: () => void }> = function ({ onConfirm }) {
  const [value, setValue] = useState('');

  async function handlePasswordConfirm() {
    await request<{ success: true }>('git-set-password', { password: value });
    onConfirm();
  }

  return <div className={styles.passwordPrompt}>
    <FormGroup
        label="Please enter repository password:"
        helperText="The password will be kept in memory and not stored to disk.">
      <InputGroup
        type="password"
        value={value}
        onChange={(event: React.FormEvent<HTMLElement>) => setValue((event.target as HTMLInputElement).value)}
        leftIcon="key"
        rightElement={
          value.trim() === ''
          ? undefined
          : <Button
                minimal={true}
                onClick={handlePasswordConfirm}
                icon="tick"
                intent="primary">
              Confirm
            </Button>}
      />
    </FormGroup>
  </div>;
};
