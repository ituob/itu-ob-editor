import React, { useContext } from 'react';
import { FormGroup, InputGroup, ButtonGroup, Button } from '@blueprintjs/core';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { Dataset, DataObject } from 'models/dataset';
import { EditorViewProps } from './types';
import Sortable from 'renderer/widgets/dnd-sortable';


interface DatasetMetaEditorProps extends EditorViewProps<Dataset> {}


const DatasetMeta: React.FC<DatasetMetaEditorProps> = function ({ obj, onChange }) {
  const dataset = obj;
  const lang = useContext(LangConfigContext);
  return (
    <>
      <FormGroup label="Dataset title">
        <InputGroup
          value={dataset.title ? dataset.title[lang.selected] : ''}
          onChange={(evt: React.FormEvent<HTMLInputElement>) => {
            const newTitle = evt.currentTarget.value as string;
            if (newTitle.trim() !== '') {
              onChange({ ...obj, title: { ...obj.title, [lang.selected]: newTitle } });
            } else {
              var title = { ...obj.title || {} };
              if (Object.keys(title).length > 0 && title[lang.selected]) {
                delete title[lang.selected];
                onChange({ ...obj, title });
              }
              if (Object.keys(title).length < 1) {
                var newObj = { ...obj };
                delete newObj.title;
                onChange(newObj);
              }
            }
          }}
        />
      </FormGroup>

      <FormGroup label="Dataset type">
        <ButtonGroup>
          <Button active={obj.type === 'array'} onClick={() => onChange({ ...obj, type: 'array' })}>Array (list of items)</Button>
          <Button active={obj.type === 'index'} onClick={() => onChange({ ...obj, type: 'index' })}>Index (key-value structure)</Button>
        </ButtonGroup>
      </FormGroup>

      <DataItemSpec item={obj.item} onChange={(newItem) => onChange({ ...obj, item: newItem })} nestingLevel={0} />
    </>
  );
};


interface DataItemSpecProps {
  item: DataObject
  onChange: (newItem: DataObject) => void
  nestingLevel: number 
}
const DataItemSpec: React.FC<DataItemSpecProps> = function ({ item, onChange, nestingLevel }) {
  return (
    <>
      <div>
        {[ ...item.fields.entries() ].map(([idx, field]) =>
          <Sortable
              key={(item.fields || []).indexOf(field)}
              idx={idx}
              itemType={`${nestingLevel}-field`}
              onReorder={moveField}
              handleIcon="menu"
              className={`${styles.sortable} ${styles.metaAuthorContactItem}`}
              draggingClassName={styles.sortableDragged}
              droppableClassName={styles.sortableOver}
              handleClassName={styles.sortableDragHandle}>
            {field !== undefined
              ? <DataFieldSpec
                  key={idx}
                  field={field}
                  onDelete={() => deleteField(idx)}
                  onChange={(newField) => updateField(idx, newField)} />
              : null}
          </Sortable>
        )}
        <div className={styles.newField}>
          <Button onClick={appendField} icon="add">Add field</Button>
        </div>
      </div>
    </>
  );
};

export default DatasetMeta;