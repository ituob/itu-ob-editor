import * as React from 'react';
import { Workspace } from 'renderer/app/storage';
import { MessageType, Message, ApprovedRecommendationsMessage } from '..//models';


function isApprovedRecommendations(msg: Message): msg is ApprovedRecommendationsMessage {
  return msg.type === 'approved_recommendations';
}

export function getMessageTemplate<T extends MessageType>(type: T, msg: Message): {
    title: string,
    getBodyView: (workspace: Workspace) => any } {

  if (isApprovedRecommendations(msg)) {
    const recommendations = msg.items as { [code: string]: string };
    return {
      title: "approved recommendations",
      getBodyView: (workspace) => {
        return (
          <React.Fragment>
            {Object.entries(recommendations).map(([code, version]: [string, string]) => (
              <span>{code}</span>
            ))}
          </React.Fragment>
        );
      },
    };

  } else {
    return {
      title: "message",
      getBodyView: (workspace) => (
        <React.Fragment>{msg.toString()}</React.Fragment>
      )
    };
  }
}
