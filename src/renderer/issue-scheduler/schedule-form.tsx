import React from 'react';
import { Button, ButtonGroup, InputGroup, FormGroup } from '@blueprintjs/core';

import { DateStamp } from 'renderer/widgets/dates';
import { app } from 'renderer/index';
import * as styles from './styles.scss';


export interface IssueDraft {
  id?: number,
  publication_date?: Date,
  cutoff_date?: Date,
}


interface ScheduleFormProps {
  busy: boolean,
  draft: IssueDraft,
  maxId?: number,
  minId?: number,
  onChange: (draft: IssueDraft | null) => void,
  onSave: () => void,
  onCancel: () => void,
}
export const ScheduleForm: React.FC<ScheduleFormProps> = function ({ busy, draft, maxId, minId, onChange, onSave, onCancel }) {
  const existingIDs = app.useIDs<number>('issues').ids;

  function validateId(val: number | undefined): string[] {
    if (!val) {
      return ['a number'];
    }

    const numId = val as number;

    var requirements: string[] = [];
    if (numId < (minId || 0)) {
      requirements.push(`larger than ${minId || 'zero'}`);
    }
    if (numId > (maxId || Number.MAX_SAFE_INTEGER)) {
      requirements.push(`smaller than ${maxId || 'infinity'}`);
    }
    return requirements;
  }

  const idRequirements = validateId(draft.id);
  const idRequirementsText = idRequirements.length > 0
    ? `Should be ${idRequirements.join(', ')}.`
    : undefined;

  const issueExists = draft.id ? existingIDs.indexOf(draft.id) >= 0 : false;
  const alreadyExistsError = busy === false && issueExists === true
    ? <>
        Edition {draft.id} already exists.
        &ensp;
        <a onClick={() => app.openObjectEditor('issues', draft.id)}>Open</a>
      </>
    : undefined;

  return (
    <div className={styles.scheduleForm}>

      <div className={styles.scheduleFormBody}>
        <p className={styles.scheduleFormCutoffDate}>
          <strong>Cutoff:</strong>
          <span>
            {draft.cutoff_date !== undefined && draft.cutoff_date !== null
              ? <strong><DateStamp date={draft.cutoff_date} /></strong>
              : null}
          </span>
          <Button
            small={true}
            className={styles.editDateButton}
            onClick={() => onChange({ ...draft, cutoff_date: undefined })}
            disabled={draft.cutoff_date === undefined}
            text={draft.cutoff_date === undefined ? "Click to set" : undefined}
            icon={draft.cutoff_date !== undefined ? 'edit' : 'arrow-up'} />
        </p>

        <p className={styles.scheduleFormPublicationDate}>
          <strong>Publication:</strong>
          <span>
            {draft.publication_date !== undefined
              ? <strong><DateStamp date={draft.publication_date} /></strong>
              : null}
          </span>
          <Button
            small={true}
            className={styles.editDateButton}
            onClick={() => onChange({ ...draft, publication_date: undefined })}
            disabled={draft.publication_date === undefined}
            text={draft.publication_date === undefined ? "Click to set" : undefined}
            icon={draft.publication_date !== undefined ? 'edit' : 'arrow-up'} />
        </p>

        <FormGroup
            label="Edition no.:"
            labelFor="issue-id"
            intent={(idRequirements.length > 0 || issueExists) ? 'danger' : undefined}
            helperText={idRequirementsText || alreadyExistsError}>
          <InputGroup
            type="number"
            id="issue-id"
            large={true}
            placeholder="E.g., 1234"
            value={draft.id ? draft.id.toString() : ''}
            intent={idRequirements.length > 0 ? 'danger' : undefined}
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              onChange({ ...draft, id: parseInt((evt.target as HTMLInputElement).value, 10) });
            }}
          />
        </FormGroup>
      </div>

      <div className={styles.scheduleFormActions}>
        <ButtonGroup fill={true}>
          <Button disabled={busy} icon="undo" onClick={onCancel}>Cancel</Button>
          <Button
            intent="success"
            icon="git-commit"
            disabled={
              busy ||
              issueExists ||
              idRequirements.length > 0 ||
              draft.publication_date === undefined ||
              draft.cutoff_date === undefined
            }
            loading={busy}
            onClick={onSave}
            title="Save new issue schedule">Commit</Button>
        </ButtonGroup>
      </div>
    </div>
  );
};
