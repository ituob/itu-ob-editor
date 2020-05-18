import { remote } from 'electron';

import React, { useState } from 'react';

import { Button, FormGroup, Text } from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';
import { PaneHeader } from 'coulomb/renderer/widgets';

import { app } from 'renderer/index';
import { useLatestAnnex } from 'renderer/hooks';
import { DateStamp } from 'renderer/widgets/dates';
import { RecommendationTitle, PublicationTitle } from 'renderer/widgets/publication-title';
import { HelpButton } from 'renderer/widgets/help-button';
import { Publication } from 'models/publications';
import * as styles from './styles.scss';


interface AnnexEditorProps {
  pubId: string
  position: Date | undefined
  onChange?: (pubId: string, updatedPosition: Date | undefined) => void
  issueId: number
}
export const AnnexEditor: React.FC<AnnexEditorProps> =
function ({ pubId, position, onChange, issueId }) {
  const [editingPosition, updateEditingPosition] = useState(false);
  const pub = app.useOne<Publication, string>('publications', pubId).object;
  const latestAnnex = useLatestAnnex(pubId, issueId);

  const pubUrl = pub ? pub.url : undefined;

  let previousAnnexDetails: JSX.Element;
  if (latestAnnex) {
    const date = latestAnnex.positionOn;
    if (date) {
      previousAnnexDetails = <>
        Superseding position <DateStamp date={date} />
        previously annexed to OB {latestAnnex.annexedTo.id}
      </>;
    } else {
      previousAnnexDetails = <>
        Superseding unspecified position
        previously annexed to OB {latestAnnex.annexedTo.id}
      </>;
    }
  } else {
    previousAnnexDetails = <>
      Annexing this publication for (apparently) the first time
    </>;
  }

  let currentPosition: JSX.Element;
  if (onChange && !editingPosition) {
    currentPosition = (
        <Button
            title="Click to set or change the annexed position."
            intent={position ? undefined : "primary"}
            onClick={() => updateEditingPosition(true)}>
          {position ? <DateStamp date={position} /> : "Specify"}
        </Button>
    );
  } else if (position) {
    currentPosition = <DateStamp date={position} />;
  } else {
    currentPosition = <em>unspecified</em>;
  }

  return (
    <>
      <div className={styles.messageEditorPaneHeader}>
        <PaneHeader
            align="left"
            major={true}
            actions={<HelpButton className="big-icon-button" path="annex-publication/" />}>
          <small>Annex</small>&ensp;<PublicationTitle id={pubId} />
        </PaneHeader>

        <div className={styles.editorMeta}>
          {pub && pub.recommendation
            ? <Text ellipsize={true}>
                Per <RecommendationTitle rec={pub.recommendation} />
              </Text>
            : null}
          {pubUrl !== undefined
            ? <Text ellipsize={true}>
                SP resource: <a onClick={() => remote.shell.openExternal(pubUrl)}>{pubUrl}</a>
              </Text>
            : null}
          <div>{previousAnnexDetails}:</div>
        </div>
      </div>

      <FormGroup
          label={<>
            Position presently annexed:
            &ensp;
            <span className={styles.annexEditorPosition}>
              {currentPosition}
            </span>
          </>}
          helperText={onChange && !position
            ? <>
                <p>
                  The position of ITU SP annexed to OB is expressed by date.
                </p>
                <p>
                  For a dataset that’s being annexed multiple times to different OBs,
                  the position annexed to <em>this</em> OB should be specified here.
                </p>
              </>
            : undefined}>
        {onChange && editingPosition
          ? <DatePicker
              value={position}
              canClearSelection={true}
              showActionsBar={true}
              onChange={newDate => {
                onChange(pubId, newDate);
                updateEditingPosition(false);
              }}
            />
          : null}
      </FormGroup>
    </>
  );
};
