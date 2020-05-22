import React from 'react';
import { Position, Menu } from '@blueprintjs/core';
import { Select, ItemPredicate, ItemRenderer, ItemListRenderer, renderFilteredItems } from '@blueprintjs/select';

import { Index, QuerySet } from 'coulomb/db/query';
import { AddCardTriggerButton } from 'coulomb/renderer/widgets';
import * as editableCardListStyles from 'coulomb/renderer/widgets/editable-card-list/styles.scss';

import { Publication } from 'models/publications';

import { app } from 'renderer/index';
import { PublicationTitle } from 'renderer/widgets/publication-title';
import { NewItemPromptProps } from 'renderer/widgets/item-list/new-item-menu';
import * as styles from '../styles.scss';
import { useRunningAnnexes } from 'renderer/hooks';


const MAX_MENU_ITEMS_TO_SHOW = 7;

interface AnnexablePublication {
  id: string,
  position: Date | null,
}


type NewAnnexPromptProps = NewItemPromptProps & {
  issueId: number,
  disabledPublicationIDs: string[],
  publicationIndex: Index<Publication>,
}
export const NewAnnexPrompt: React.FC<NewAnnexPromptProps> = function (props) {
  const runningAnnexes = useRunningAnnexes(props.issueId);

  const annexedPublicationIds = runningAnnexes.map(item => item.publicationID);
  const nonAnnexedPublications = new QuerySet<Publication>(props.publicationIndex).
    filter((item: [string, Publication]) => annexedPublicationIds.indexOf(item[0]) < 0).all();

  const items: AnnexablePublication[] = [...runningAnnexes.map(annex => { return {
    id: annex.publicationID,
    position: annex.positionOn,
  }}), ...nonAnnexedPublications.map(pub => { return {
    id: pub.id,
    position: null,
  }})];

  function createAnnex(pub: AnnexablePublication) {
    return pub.id;
  }

  return (
    <NewAnnexSelector
      popoverProps={{
        wrapperTagName: 'div',
        targetTagName: 'div',
        position: Position.LEFT,
        minimal: true,
        boundary: "viewport",
      }}
      className={editableCardListStyles.addCardTriggerContainer}
      initialContent={filterUsageTip}
      items={items}
      itemRenderer={NewAnnexMenuItemRenderer}
      itemListRenderer={NewAnnexMenuRenderer}
      itemPredicate={NewAnnexMenuItemFilter}
      itemDisabled={(item) => {
        return props.disabledPublicationIDs.indexOf(item.id) >= 0;
      }}
      onItemSelect={(pub: AnnexablePublication) =>
        props.onCreate(createAnnex(pub))}
    ><AddCardTriggerButton highlight={props.highlight} label="Annex service publication" /></NewAnnexSelector>
  );
};


const noResultsMessage = (
  <Menu.Item disabled={true} text="No matching publications!" />
);

const filterUsageTip = (
  <Menu.Item disabled={true} text="Type publication title or rec. ID…" />
);

const NewAnnexMenuRenderer: ItemListRenderer<AnnexablePublication> =
    function (props) {

  const hasExactMatch = props.filteredItems.
    find(i => i.id.toLowerCase() === props.query.trim().toLowerCase()) !== undefined;
  const filteredItems = props.filteredItems.slice(0, MAX_MENU_ITEMS_TO_SHOW);

  return (
    <Menu ulRef={props.itemsParentRef} className={styles.newItemMenu}>
      {renderFilteredItems({
        ...props,
        filteredItems: filteredItems,
      }, noResultsMessage, filterUsageTip)}

      {props.query !== '' && hasExactMatch === false
        ? renderLaunchPublicationCreator(props.query)
        : null}
    </Menu>
  );
};

const NewAnnexMenuItemRenderer: ItemRenderer<AnnexablePublication> =
    function ({ id }, { handleClick, modifiers, query }) {

  return (
    <Menu.Item
      key={id}
      text={<PublicationTitle id={id} />}
      onClick={handleClick}
      active={modifiers.active}
      title={modifiers.disabled ? `Publication was annexed to or amended in this edition` : undefined}
      disabled={modifiers.disabled} />
  );
};

const NewAnnexMenuItemFilter: ItemPredicate<AnnexablePublication> =
    function (query, pub, _index, exactMatch) {

  //const normalizedTitle: string = pub.title.toLowerCase();
  const normalizedId: string = pub.id.toLowerCase();
  const normalizedQuery: string = query.toLowerCase();

  if (exactMatch) {
    return normalizedId === normalizedQuery;
  } else {
    return normalizedId.indexOf(normalizedQuery) >= 0;
  }
};

const renderLaunchPublicationCreator = function (query: string) {
  const MAX_ID_LENGTH_IN_PROMPT = 5;

  return (
    <Menu.Item
      icon="add"
      text={`Use “${(query.length > MAX_ID_LENGTH_IN_PROMPT) ? query.substr(0, MAX_ID_LENGTH_IN_PROMPT - 1) + '…' : query}” as new ID`}
      title="Define new publication with this ID"
      onClick={() => launchPublicationEditor(query)}
    />
  );
}

function launchPublicationEditor(forPublicationWithId: string) {
  app.openObjectEditor('publications', forPublicationWithId, 'create=true');
}

const NewAnnexSelector = Select.ofType<AnnexablePublication>();
