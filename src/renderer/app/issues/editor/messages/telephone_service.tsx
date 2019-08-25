import React from 'react';
import { UL } from '@blueprintjs/core';

import {
  TSCommunication,
  TSCountryCommunicationSet,
  TelephoneServiceMessage,
} from 'main/issues/messages/telephone_service';

import { FreeformContents } from '../freeform-contents';
import { MessageEditorProps } from '../message-editor';


export const TelephoneServiceMessageEditor: React.FC<MessageEditorProps> = function ({ message, onChange }) {
  const countryCommSets = (message as TelephoneServiceMessage).contents;
  return (
    <React.Fragment>
      <UL>
        {countryCommSets.length > 0
          ? countryCommSets.map((countryCommSet: TSCountryCommunicationSet, countryIdx: number) => (
            <li key={countryIdx}>
              <p>{countryCommSet.country_name} (country code +{countryCommSet.phone_code})</p>

              <UL>
                {countryCommSet.communications.map((comm: TSCommunication, commIdx: number) => (
                  <li key={commIdx}>
                    <p>Communication of {comm.date.toString()}</p>

                    <FreeformContents
                      doc={comm.contents}
                      onChange={(updatedDoc) => {
                        Object.keys(comm.contents).forEach(function(key) {
                          delete comm.contents[key];
                        });
                        Object.assign(comm.contents, JSON.parse(JSON.stringify(updatedDoc, null, 2)));
                      }}
                    />
                  </li>
                ))}
              </UL>
            </li>))
          : <p>No communications to display.</p>
        }
      </UL>
    </React.Fragment>
  );
};
