import React from 'react';
import { Menu } from '@blueprintjs/core';
import { Select, ItemPredicate, ItemRenderer, ItemListRenderer, renderFilteredItems } from '@blueprintjs/select';

import { Index, QuerySet } from 'sse/storage/query';
import { AddCardTriggerButton } from 'sse/renderer/widgets/editable-card-list';
import * as editableCardListStyles from 'sse/renderer/widgets/editable-card-list/styles.scss';

import { Publication } from 'models/publications';
import { OBIssue } from 'models/issues';
import { Message, AmendmentMessage } from 'models/messages';

import { getRunningAnnexesForIssue } from '../running-annexes';
import { NewMessagePromptProps } from './message-editor';
import * as styles from './styles.scss';


const MAX_MENU_ITEMS_TO_SHOW = 7;


type NewAmendmentPromptProps = NewMessagePromptProps & {
  issueIndex: Index<OBIssue>,
  publicationIndex: Index<Publication>,
}
export const NewAmendmentPrompt: React.FC<NewAmendmentPromptProps> = function (props) {
  const runningAnnexes = getRunningAnnexesForIssue(
    props.issue,
    props.issueIndex,
    props.publicationIndex);

  const annexedPublicationIds = runningAnnexes.map(item => item.publication.id);
  const nonAnnexedPublications = new QuerySet<Publication>(props.publicationIndex).
    filter((item: [string, Publication]) => annexedPublicationIds.indexOf(item[0]) < 0).all();

  const items = [...runningAnnexes.map(annex => { return {
    title: annex.publication.title.en,
    id: annex.publication.id,
    position: annex.publication.positionOn,
  }}), ...nonAnnexedPublications.map(pub => { return {
    title: pub.title.en,
    id: pub.id,
    position: null,
  }})];

  function createAmendmentMessage(pub: AmendablePublication) {
    let positionString: string | undefined;
    const position = pub.position;
    if (position != null) {
      positionString = `${position.getFullYear()}-${position.getMonth()}-${position.getDate()}`;
    }
    return {
      type: 'amendment',
      target: {
        publication: pub.id,
        position_on: positionString,
      },
      contents: {},
    } as Message;
  }

  return (
    <NewAmendmentSelector
      popoverProps={{
        wrapperTagName: 'div',
        targetTagName: 'div',
      }}
      className={editableCardListStyles.addCardTriggerContainer}
      initialContent={filterUsageTip}
      items={items}
      itemRenderer={NewAmendmentMenuItemRenderer}
      itemListRenderer={NewAmendmentMenuRenderer}
      itemPredicate={NewAmendmentMenuItemFilter}
      itemDisabled={(item) => {
        return props.issue.amendments.messages.map((amd: Message) => {
          return (amd as AmendmentMessage).target.publication;
        }).indexOf(item.id) >= 0;
      }}
      onItemSelect={(pub: AmendablePublication) =>
        props.handleNewMessage(createAmendmentMessage(pub), props.idx)}
    ><AddCardTriggerButton /></NewAmendmentSelector>
  );
};


const noResultsMessage = (
  <Menu.Item disabled={true} text="No matching publications!" />
);

const filterUsageTip = (
  <Menu.Item disabled={true} text="Type publication title or rec. ID…" />
);

interface AmendablePublication {
  title: string,
  id: string,
  position: Date | null,
}

const NewAmendmentMenuRenderer: ItemListRenderer<AmendablePublication> =
    function (props) {
  return (
    <Menu ulRef={props.itemsParentRef} className={styles.newMessageMenu}>
      {renderFilteredItems({
        ...props,
        filteredItems: props.filteredItems.slice(0, MAX_MENU_ITEMS_TO_SHOW),
      }, noResultsMessage, filterUsageTip)}
    </Menu>
  );
};

const NewAmendmentMenuItemRenderer: ItemRenderer<AmendablePublication> =
    function (pub, { handleClick, modifiers, query }) {

  return (
    <Menu.Item
      key={pub.id}
      text={pub.title}
      onClick={handleClick}
      active={modifiers.active}
      disabled={modifiers.disabled} />
  );
};

const NewAmendmentMenuItemFilter: ItemPredicate<AmendablePublication> =
    function (query, pub, _index, exactMatch) {

  const normalizedTitle: string = pub.title.toLowerCase();
  const normalizedId: string = pub.id.toLowerCase();
  const normalizedQuery: string = query.toLowerCase();

  if (exactMatch) {
    return normalizedTitle === normalizedQuery;
  } else {
    return `${normalizedId} ${normalizedTitle}`.indexOf(normalizedQuery) >= 0;
  }
};

const NewAmendmentSelector = Select.ofType<AmendablePublication>();
