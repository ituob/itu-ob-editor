import * as React from 'react';
import { Card, H5 } from '@blueprintjs/core';
import { Workspace } from 'renderer/app/storage';
import { getMessageTemplate } from './message-templates';
import * as styles from './styles.scss';


interface MessageViewProps {
  msg: any,
  workspace: Workspace,
}
export function MessageView(props: MessageViewProps) {
  const tpl = getMessageTemplate(props.msg.type, props.msg);

  if (tpl) {
    return (
      <Card>
        <article className={styles.message}>
          <header className={styles.messageHeader}>
            <H5>{tpl.title}</H5>
          </header>
          <div className={styles.messageBody}>
            {tpl.getBodyView(props.workspace)}
          </div>
        </article>
      </Card>
    );
  } else {
    return null;
  }
}
