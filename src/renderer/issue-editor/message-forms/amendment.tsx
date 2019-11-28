import { remote } from 'electron';

import React, { useContext } from 'react';
import { Icon, Text } from '@blueprintjs/core';

import { LangConfigContext } from 'sse/localizer/renderer';

import { OBIssue } from 'models/issues';
import { Message as AmendmentMessage } from 'models/messages/amendment';
import { usePublication, useLatestAnnex } from 'storage/renderer';
import { DateStamp } from 'renderer/widgets/dates';
import { RecommendationTitle } from 'renderer/widgets/publication-title';
import { FreeformContents } from '../freeform-contents';
import { MessageFormProps } from '../message-editor';


export const MessageForm: React.FC<MessageFormProps> = function ({ message, onChange }) {
  const lang = useContext(LangConfigContext);
  const msg = message as AmendmentMessage;

  return (
    <FreeformContents
      defaultValue={(msg.contents || {})[lang.default] || {}}
      onChange={(updatedDoc) => {
        onChange({ ...msg, contents: { ...msg.contents, [lang.default]: updatedDoc } });
      }}
    />
  );
};


export const AmendmentMeta: React.FC<{ amendment: AmendmentMessage, issue: OBIssue }> = function ({ amendment, issue }) {
  const pubId = amendment.target.publication;
  const pub = usePublication(pubId);
  const latestAnnex = useLatestAnnex(issue.id, pubId);
  const pubUrl = pub ? pub.url : undefined;

  if (pub) {
    return <>
      {pub.recommendation
        ? <Text ellipsize={true}>Per <RecommendationTitle rec={pub.recommendation} /></Text>
        : null}
      {pubUrl
        ? <Text ellipsize={true}>SP resource: <a onClick={() => remote.shell.openExternal(pubUrl)}>{pubUrl}</a></Text>
        : null}
      {latestAnnex && latestAnnex.positionOn
        ? <div>Amending position of <DateStamp date={latestAnnex.positionOn} /> annexed to OB {latestAnnex.annexedTo.id}:</div>
        : <div><Icon icon="warning-sign" /> This publication doesn’t seem to have been annexed to OB</div>}
    </>;
  } else {
    return <>Publication amended is not found in the database</>
  }
};
