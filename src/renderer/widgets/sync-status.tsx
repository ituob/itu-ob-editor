import { ipcRenderer } from 'electron';

import React, { useState, useContext } from 'react';
import { Button, IconName, Tooltip, FormGroup, InputGroup, Intent, Icon, Popover, Position } from '@blueprintjs/core';

import { useIPCValue, callIPC } from 'coulomb/ipc/renderer';
import { conf, app } from '..';

import * as styles from './sync-status.scss';
import { SingleDBStatusContext } from 'renderer/single-db-status-context';


type AnyIDType = string | number;
type AnyDataType = keyof typeof conf["app"]["data"];


interface StorageStatusProps {
  className?: string,
  iconClassName?: string,
  tooltipPosition?: Position,
}
export const StorageStatus: React.FC<StorageStatusProps> = function ({ className, iconClassName, tooltipPosition }) {
  const remote = useContext(SingleDBStatusContext)?.status;

  const modifiedIds: { [K in AnyDataType]: string[] } =
  Object.keys(conf.app.data).map((key) => {
    return {
      [key]: useIPCValue<{}, string[]>(`model-${key}-read-uncommitted-ids`, []).value,
    };
  }).reduce((prevValue, currValue) => ({ ...prevValue, ...currValue }));

  const [passwordPromptIsOpen, openPasswordPrompt] = useState(false);

  async function triggerStorageSync() {
    await callIPC('db-default-git-trigger-sync');
  }

  let statusIcon: IconName;
  let tooltipText: string | undefined;
  let statusIntent: Intent;
  let action: null | (() => void);

  if (remote.isMisconfigured) {
    statusIcon = "error";
    tooltipText = "Remote storage is missing configuration";
    statusIntent = "danger";
    action = () => app.openPredefinedWindow('settings');
  } else if (remote.hasLocalChanges) {
    statusIcon = "git-commit";
    tooltipText = "Uncommitted local changes present—click to resolve";
    statusIntent = "warning";
    action = async () => {
      // Discard orphaned files, if any, before opening batch commit window
      const hasModifiedItems = Object.values(modifiedIds).
        reduce((acc, val) => { return [ ...acc, ...Object.keys(val) ] }, [] as AnyIDType[]).length > 0;
      if (remote.hasLocalChanges && !hasModifiedItems) {
        await ipcRenderer.send('db-default-discard-unstaged');
        await triggerStorageSync();
      } else {
        app.openPredefinedWindow('batchCommit');
      }
    }

  } else if (!remote.isOnline) {
    statusIcon = "offline";
    tooltipText = "No connection to remote storage—click to retry";
    statusIntent = "primary";
    action = triggerStorageSync;

  } else if (remote.isPulling) {
    statusIcon = "cloud-download"
    tooltipText = "Synchronizing remote storage…";
    statusIntent = "primary";
    action = null;

  } else if (remote.isPushing) {
    statusIcon = "cloud-upload"
    tooltipText = "Synchronizing remote storage…";
    statusIntent = "primary";
    action = null;

  } else if (remote.statusRelativeToLocal === 'diverged') {
    statusIcon = "git-branch"
    tooltipText = "Local and remote storage have diverging changes—click to retry";
    statusIntent = "danger";
    action = triggerStorageSync;

  } else if (remote.statusRelativeToLocal === 'behind') {
    statusIcon = "cloud-upload"
    tooltipText = "Pending changes to upload";
    statusIntent = "warning";
    action = null;

  } else {
    statusIcon = "updated"
    tooltipText = "Click to trigger remote storage sync";
    statusIntent = "success";
    action = triggerStorageSync;
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


export const PasswordPrompt: React.FC<{ onConfirm: () => void }> = function ({ onConfirm }) {
  const [value, setValue] = useState('');

  async function handlePasswordConfirm() {
    await callIPC<{ password: string }, { success: true }>('db-default-git-set-password', { password: value });
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
