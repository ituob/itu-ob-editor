import React from 'react';
import { Card, Text, Button } from '@blueprintjs/core';
import * as styles from './styles.scss';


export const AddCardTrigger: React.FC<{ onClick?: (...args: any[]) => void }> = function ({ onClick }) {
  return (
    <div className={styles.addCardTriggerContainer}>
      <AddCardTriggerButton onClick={onClick} />
    </div>
  );
};


// If using separately from AddCardTrigger, wrap into element with addCardTriggerContainer class
export const AddCardTriggerButton: React.FC<{ onClick?: (...args: any[]) => void }> = function ({ onClick }) {
  return <Button icon="plus" onClick={onClick} className={styles.addCardTrigger} />;
};


interface SimpleEditableCardProps {
  selected?: boolean,
  onDelete?: () => void,
  onSelect?: () => void 
}
export const SimpleEditableCard: React.FC<SimpleEditableCardProps> = function (props) {
  return (
    <Card
        className={`${styles.editableCard} ${props.selected ? styles.editableCardSelected : ''}`}
        onClick={props.onSelect}>

      <Text ellipsize={true}>
        {props.children}
      </Text>

      {props.onDelete
        ? <Button
            onClick={(evt: any) => {
              props.onDelete ? props.onDelete() : void 0;
              evt.stopPropagation();
              return false;
            }}
            intent="danger"
            icon="cross"
            className={styles.editableCardDeleteButton}
            minimal={true}
            small={true}
          />
        : ''}

    </Card>
  );
};
