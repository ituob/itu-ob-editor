import * as React from 'react';
import { Card, H5 } from '@blueprintjs/core';
import { Workspace } from 'renderer/app/storage';
import { getMessageTemplate } from './message-templates';
import * as styles from './styles.scss';


interface MessageViewProps {
  msg: any,
  workspace: Workspace,
  onChange: (updatedMessage: any) => void,
}
export function MessageView(props: MessageViewProps) {
  const tpl = getMessageTemplate(props.msg);
  const MessageBody = tpl.getBodyView;

  if (tpl) {
    return (
      <Card>
        <article className={styles.message}>
          <header className={styles.messageHeader}>
            <H5>{tpl.title}</H5>
          </header>
          <div className={styles.messageBody}>
            <MessageBody workspace={props.workspace} onChange={props.onChange} />
          </div>
        </article>
      </Card>
    );
  } else {
    return null;
  }
}
