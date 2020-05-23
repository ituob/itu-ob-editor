import React, { useContext } from 'react';
import { FormGroup, InputGroup, ButtonGroup, Button } from '@blueprintjs/core';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { DataItem, Dataset, DataObject, ManipulatedDataItem, DataArray, DataIndex } from 'models/dataset';
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

      <DataItemSpec
        item={obj}
        onChange={(newItem) => onChange({ ...obj, ...(newItem as (DataIndex | DataArray)) })}
        nestingLevel={0}
        allowedTypes={['array', 'index']}
      />
    </>
  );
};


const FIELD_TYPES: DataItem["type"][] = ['text', 'translated-text', 'number', 'boolean'];
const COMPLEX_FIELD_TYPES: DataItem["type"][] = ['array', 'object'];


interface DataItemSpecProps {
  item: ManipulatedDataItem
  allowedTypes?: ('index' | DataItem["type"])[]
  onChange: (newItem: ManipulatedDataItem) => void
  nestingLevel: number 
}
const DataItemSpec: React.FC<DataItemSpecProps> = function ({ item, onChange, nestingLevel, allowedTypes }) {
  const typeOptions = allowedTypes || [ ...FIELD_TYPES, ...COMPLEX_FIELD_TYPES ];
  const lang = useContext(LangConfigContext);

  console.debug(nestingLevel, item, allowedTypes);

  function moveField() {
  }

  function deleteField(idx: number) {
  }

  function updateField(idx: number, newField: ManipulatedDataItem) {
  }

  function appendField() {
  }

  let itemEditor: JSX.Element;
  if (item.type === 'object') {
    itemEditor = (
      <>
        {[ ...item.fields.entries() ].map(([idx, field]) =>
          field !== undefined
          ? <Sortable
                key={(item.fields || []).indexOf(field)}
                idx={idx}
                itemType={`${nestingLevel}-field`}
                onReorder={moveField}
                handleIcon="menu">
              <Button
                  onClick={() => deleteField(idx)}
                  icon="delete"
                  title="Delete this field.">
                Delete
              </Button>
              <DataItemSpec
                item={field}
                nestingLevel={nestingLevel + 1}
                onChange={(newField) => updateField(idx, newField)} />
            </Sortable>
          : null
        )}
        <div>
          <Button onClick={appendField} icon="add">Add field</Button>
        </div>
      </>
    );
  } else if (item.type === 'array' || item.type === 'index') {
    itemEditor = <DataItemSpec
      item={item.item}
      allowedTypes={['object']}
      nestingLevel={nestingLevel + 1}
      onChange={(newItem) => onChange({ ...item, item: newItem as DataObject })}
    />;
  } else {
    itemEditor = (
      <FormGroup label="Field label">
        <InputGroup
          type="text"
          value={item.label[lang.selected]}
          onChange={(evt: React.FormEvent<HTMLInputElement>) =>
            onChange({
              ...item,
              label: {
                ...item.label,
                [lang.selected]: evt.currentTarget.value as string,
              }
            })
          }/>
      </FormGroup>
    );
  }

  return (
    <>
      <FormGroup inline>
        <ButtonGroup>
          {typeOptions.map(typ =>
            <Button
                key={typ}
                active={item.type === typ}
                onClick={() => onChange({ ...item, type: typ } as ManipulatedDataItem /* <-- TYPECAST DANGER */)}>
              {typ}
            </Button>
          )}
        </ButtonGroup>
      </FormGroup>

      <div>
        {itemEditor}
      </div>
    </>
  );
};


// interface DataFieldSpecProps {
//   field: DataItem
//   onDelete: () => void
//   onChange: (newField: DataItem) => void
// }
// const DataFieldSpec: React.FC<DataFieldSpecProps> = function ({ field, onDelete, onChange }) {
//   return <p>Field!</p>;
// };


export default DatasetMeta;