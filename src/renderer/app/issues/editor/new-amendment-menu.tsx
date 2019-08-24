import React from 'react';
import { Menu } from '@blueprintjs/core';
import { Index, QuerySet } from 'main/storage/query';
import { Publication } from 'main/lists/models';
import { OBIssue } from 'main/issues/models';
import { AmendmentMessage } from 'main/issues/messages';
import { RunningAnnex, getRunningAnnexesForIssue } from '../running-annexes';
import * as styles from './styles.scss';


interface NewAmendmentMessageMenuProps {
  issue: OBIssue,
  issueIndex: Index<OBIssue>,
  publicationIndex: Index<Publication>,
  onCreate: (message: AmendmentMessage) => void,
}
export function NewAmendmentMessageMenu(props: NewAmendmentMessageMenuProps) {
  const runningAnnexes = getRunningAnnexesForIssue(
    props.issue,
    props.issueIndex,
    props.publicationIndex);

  const annexedPublicationIds = runningAnnexes.map(item => item.publication.id);
  const nonAnnexedPublications = new QuerySet<Publication>(props.publicationIndex).
    filter((item: [string, Publication]) => annexedPublicationIds.indexOf(item[0]) < 0).all();

  function createAmendmentMessage(
      forPublication: Publication,
      atPosition: Date | null | undefined = undefined) {
    let positionString: string | undefined;
    if (atPosition) {
      positionString: `${atPosition.getFullYear()}-${atPosition.getMonth()}-${atPosition.getDate()}`
    }
    props.onCreate({
      type: 'amendment',
      target: {
        publication: forPublication.id,
        position_on: positionString,
      },
      contents: {},
    });
  }

  return (
    <Menu className={styles.newMessageMenu}>

      {runningAnnexes.length > 0
        ? <React.Fragment>
            <Menu.Divider title="Amend annexed list" />
            {runningAnnexes.map((annex: RunningAnnex) => (
              <Menu.Item
                key={annex.publication.id}
                text={annex.publication.title.en}
                onClick={() => createAmendmentMessage(annex.publication, annex.positionOn)}
                shouldDismissPopover={true}
              />
            ))}
          </React.Fragment>
        : null}

      {nonAnnexedPublications.length > 0
        ? <React.Fragment>
            <Menu.Divider title="Amend another publication" />
            {nonAnnexedPublications.map((pub: Publication) => (
              <Menu.Item
                key={pub.id}
                text={pub.title.en}
                onClick={() => createAmendmentMessage(pub)}
                shouldDismissPopover={true}
              />
            ))}
          </React.Fragment>
        : null}

    </Menu>
  );
}
