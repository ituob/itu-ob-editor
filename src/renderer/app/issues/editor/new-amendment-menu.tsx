import React from 'react';
import { Menu, Button } from '@blueprintjs/core';
import { Select, ItemPredicate, ItemRenderer, ItemListRenderer } from '@blueprintjs/select';

import { Index, QuerySet } from 'main/storage/query';
import { Publication } from 'main/lists/models';
import { OBIssue } from 'main/issues/models';
import { Message, AmendmentMessage } from 'main/issues/messages';

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
      className={styles.addMessageTriggerContainer}
      items={items}
      itemRenderer={NewAmendmentMenuItemRenderer}
      itemListRenderer={NewAmendmentMenuRenderer}
      itemPredicate={NewAmendmentMenuItemFilter}
      itemDisabled={(item) => {
        return props.issue.amendments.messages.map(amd => {
          return (amd as AmendmentMessage).target.publication;
        }).indexOf(item.id) >= 0;
      }}
      onItemSelect={(pub: AmendablePublication) =>
        props.handleNewMessage(createAmendmentMessage(pub), props.idx)}
    ><Button icon="plus" className={styles.addMessageTrigger} /></NewAmendmentSelector>
  );
};


interface AmendablePublication {
  title: string,
  id: string,
  position: Date | null,
}

const NewAmendmentMenuRenderer: ItemListRenderer<AmendablePublication> =
    function ({ filteredItems, itemsParentRef, query, renderItem }) {
  const renderedItems = filteredItems.map(renderItem).
    filter(item => item != null).
    slice(0, MAX_MENU_ITEMS_TO_SHOW); 
  return (
    <Menu ulRef={itemsParentRef} className={styles.newMessageMenu}>
      {renderedItems}
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
