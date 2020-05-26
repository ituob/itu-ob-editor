import update from 'immutability-helper';
import React, { useState, useRef, useContext } from 'react';
import { PositionDatasets } from 'models/issues';
import * as styles from './styles.scss';
import DatasetMeta from 'renderer/publication-editor/dataset';
import { NonIdealState, InputGroup, ControlGroup, ButtonGroup, Button, EditableText } from '@blueprintjs/core';
import { ItemList } from 'renderer/widgets/item-list';
import {
  DataArray, DataIndex,
  ArrayStructure, IndexStructure,
  containsArray, containsIndex,
  specifiesIndex, specifiesArray,
  DataObject, DataItem, BasicField,
} from 'models/dataset';
import { VariableSizeGrid } from 'react-window';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { Trans } from 'coulomb/localizer/renderer/widgets';


interface AnnexedPositionDataEditorProps {
  datasets: PositionDatasets
  onChange?: (datasets: PositionDatasets) => void
}
export const AnnexedPositionDataEditor: React.FC<AnnexedPositionDataEditorProps> =
function({ datasets, onChange }) {
  const lang = useContext(LangConfigContext);

  const [selectedDatasetID, selectDatasetID] =
  useState<(string & (keyof typeof datasets)) | null>(null);

  const [editingData, setEditingData] = useState<boolean>(false);

  const selectedDataset = selectedDatasetID !== null ? datasets[selectedDatasetID] : null;

  let mainPane: JSX.Element;
  if (selectedDataset) {
    if (editingData) {
      mainPane = <DatasetContents
        schema={selectedDataset.meta.schema}
        data={selectedDataset.contents}
        onChange={onChange
          ? (newContents) => {
              if (selectedDatasetID !== null) {
                onChange(update(datasets, {
                  [selectedDatasetID]: {
                    contents: { $set: newContents },
                  },
                }));
              }
            }
          : undefined} />
    } else {
      mainPane = <DatasetMeta
        obj={selectedDataset.meta}
        schemaLocked={Object.keys(selectedDataset.contents).length > 0}
        onChange={onChange
          ? (newMeta) => {
              if (selectedDatasetID !== null) {
                onChange(update(datasets, {
                  [selectedDatasetID]: {
                    meta: { $set: newMeta },
                    contents: { $set: newMeta.schema.type === 'index' ? {} : [] },
                  },
                }));
              }
            }
          : undefined} />
    }
  } else {
    mainPane = <NonIdealState
      title="Nothing to show"
      description="Please use the panel on the right." />
  }

  return (
    <div className={styles.datasets}>
      <div className={styles.mainPane}>
        {mainPane}
      </div>
      <div className={styles.navigation}>
        {Object.entries(datasets).map(([idx, dataset]) =>
          <ItemList
            key={idx}
            title={dataset.meta.title ? `“${dataset.meta.title[lang.selected]}”` : idx}
            items={{ 'spec': "Settings", 'contents': "Content" }}
            onSelect={sectionIdx => {
              selectDatasetID(idx);
              setEditingData(sectionIdx === 'contents');
            }}
            selectedIdx={selectedDatasetID === idx
              ? (editingData ? 'contents' : 'spec')
              : undefined}
            itemIcon={item => item === 'Settings' ? 'cog' : 'th'}
            itemTitle={item => <>{item as string}</>}
          />
        )}
      </div>
    </div>
  );
};


interface DatasetContentsEditorProps<Schema extends DataArray | DataIndex> {
  schema: DataArray | DataIndex
  data: Schema extends DataArray ? ArrayStructure : IndexStructure
  onChange?: (data: Schema extends DataArray ? ArrayStructure : IndexStructure) => void
}
const DatasetContents: React.FC<DatasetContentsEditorProps<any>> =
function ({ schema, data, onChange }) {
  const lang = useContext(LangConfigContext);
  const [selectedRowIdx, selectRowIdx] = useState<number | undefined>(undefined);
  const [selectedColIdx, selectColIdx] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const [reordering, setReordering] = useState(false);
  const [newKey, setNewKey] = useState<string>('');

  const isArray = specifiesArray(schema) && containsArray(data);
  const isIndex = specifiesIndex(schema) && containsIndex(data);

  if (!isArray && !isIndex) {
    return <NonIdealState
      icon="error"
      title="Malformed dataset"
      description={<>
        <p>
          Dataset type as declared in schema ({schema.type})
          {" "}
          does not match dataset content
          {" "}
          (looks to be {isArray ? "array" : "index"}).
        </p>
        {onChange ? <Button onClick={() => onChange(isIndex ? {} : [])}>Reset data</Button> : null}
      </>} />;
  }


  let list: any[];
  if (data.length) {
    list = data as ArrayStructure;
  } else {
    const index = data as IndexStructure;
    list = Object.entries(index).sort(([idx1, _1], [idx2, _2]) => idx1.localeCompare(idx2));
  }

  function getKey(forItemIndex: number): string | undefined {
    if (isIndex) {
      const item = list[forItemIndex];
      if (item) {
        return list[forItemIndex][0];
      } else {
        console.error("Item with given index does not exist, unable to obtain index key", forItemIndex);
        return undefined;
      }
    } else {
      throw new Error("Can’t get string key for an array structure");
    }
  }

  const realSelectedIndex: number | undefined = ((selectedRowIdx !== undefined) && (selectedRowIdx > 0))
    ? selectedRowIdx - 1
    : undefined;

  const selectedArrayIndex = (isArray && realSelectedIndex !== undefined)
    ? realSelectedIndex
    : undefined;

  const selectedIndexKey = (isIndex && realSelectedIndex !== undefined)
    ? getKey(realSelectedIndex)
    : undefined;

  function modifyItemField(itemIndex: number, fieldID: string, newValue: any) {
    if (onChange) {

      if (isArray) {
        const idx = itemIndex;
        const item = (data as ArrayStructure)[idx];
        if (item === undefined) {
          throw new Error(`Item not found at key ${idx}`);
        }
        const newItem = update(item, { [fieldID]: { $set: newValue } });
        onChange(update(data as ArrayStructure, { $splice: [[idx, 1], [idx, 0, newItem]] }));

      } else if (isIndex) {
        const idx = list[itemIndex][0];
        const item = list[itemIndex][1];
        if (item === undefined) {
          throw new Error(`Item not found at key ${idx}`);
        }
        const newItem = update(item, { [fieldID]: { $set: newValue } });
        const newData = update(data as IndexStructure, { [idx]: { $set: newItem } });
        onChange(newData);

      }
    }
  }

  function createItemStub(): object {
    var item: any = {};
    for (const field of schema.item.fields) {
      if (field.required) {
        if (field.type === 'text') {
          item[field.id] = '';
        } else if (field.type === 'translated-text') {
          item[field.id] = { [lang.default]: '', [lang.selected]: '' };
        } else if (field.type === 'number') {
          item[field.id] = 0;
        } else if (field.type === 'boolean') {
          item[field.id] = false;
        } else {
          throw new Error("Failed to fill out field");
        }
      }
    }
    return item;
  }

  function addArrayItem(atIdx: number) {
    if (onChange && isArray) {
      onChange(update(data, { $splice: [[atIdx, 0, createItemStub()]] }));
    }
  }
  function addItemBefore() {
    if (selectedArrayIndex !== undefined && selectedArrayIndex > 0) {
      addArrayItem(selectedArrayIndex - 1);
    } else {
      addArrayItem(0);
    }
  }
  function addItemAfter() {
    if (selectedArrayIndex !== undefined) {
      addArrayItem(selectedArrayIndex + 1);
    }
  }
  function removeArrayItem() {
    if (onChange && isArray && selectedArrayIndex !== undefined) {
      onChange(update(data, { $splice: [[selectedArrayIndex, 1]] }));
    }
  }

  function moveArrayItem(fromIdx: number, toIdx: number) {
    if (onChange && isArray && (fromIdx !== undefined) && (toIdx !== undefined)) {
      setReordering(true);
      const item = list[fromIdx];
      onChange(update(data, { $splice: [[fromIdx, 1], [toIdx, 0, item]] }));
      setImmediate(() => setReordering(false));
    }
  }
  function moveItemUp() {
    if (selectedArrayIndex !== undefined && selectedArrayIndex > 0) {
      moveArrayItem(selectedArrayIndex, selectedArrayIndex - 1);
      selectRowIdx((selectedRowIdx as number) - 1);
    }
  }
  function moveItemDown() {
    if (selectedArrayIndex !== undefined) {
      moveArrayItem(selectedArrayIndex, selectedArrayIndex + 1);
      selectRowIdx((selectedRowIdx as number) + 1);
    }
  }

  function removeItem() {
    if (onChange && isIndex && selectedIndexKey !== undefined) {
      onChange(update(data, { $unset: [selectedIndexKey] }));
    }
  }
  function addItem() {
    if (onChange && isIndex) {
      onChange(update(data, { [newKey]: { $set: createItemStub() } }));
      setNewKey('');
    }
  }

  let itemOperations: JSX.Element;
  if (isArray) {
    itemOperations = <>
      <Button
        icon="add-row-top"
        disabled={!onChange || !isArray}
        onClick={addItemBefore} />
      <Button
        icon="add-row-bottom"
        disabled={!onChange || selectedArrayIndex === undefined}
        onClick={addItemAfter} />
      <Button
        icon="arrow-up"
        disabled={!onChange || selectedArrayIndex === undefined}
        onClick={moveItemUp} />
      <Button
        icon="arrow-down"
        disabled={!onChange || selectedArrayIndex === undefined}
        onClick={moveItemDown} />
      <Button
        icon="delete"
        disabled={!onChange || selectedArrayIndex === undefined}
        onClick={removeArrayItem} />
    </>;
  } else {
    itemOperations = <>
      <ControlGroup>
        <Button icon="add" disabled={!onChange || newKey.trim() === ''} onClick={addItem} />
        <InputGroup
          type="text"
          value={newKey}
          onChange={(evt: React.FormEvent<HTMLInputElement>) => setNewKey(evt.currentTarget.value as string)} />
      </ControlGroup>
      <Button icon="delete" disabled={!onChange || selectedIndexKey === undefined} onClick={removeItem} />
    </>
  }

  return (
    <div className={styles.datasetContents}>

      <ControlGroup fill className={styles.toolbar}>
        <ButtonGroup>
          {itemOperations}
        </ButtonGroup>
        <ItemSearch query={searchQuery} onChange={setSearchQuery} findingsCount={undefined} />
      </ControlGroup>

      <ItemTable
        onSelectCell={(row, col) => { selectRowIdx(row); selectColIdx(col); }}
        selectedCell={[selectedRowIdx, selectedColIdx]}
        itemCount={list.length}
        type={schema.type}
        items={list}
        fields={schema.item.fields}
        onFieldChange={onChange ? modifyItemField : undefined}
        fieldKey={({ columnIndex, rowIndex }: { columnIndex: number, rowIndex: number }): string => {
          const itemIndex = rowIndex - 1;
          if (itemIndex < 0) {
            return `thead-${columnIndex}`;
          }
          let itemKey: string | number;
          const item = list[itemIndex];
          if (isIndex) {
            if (!item) {
              throw new Error("Unable to locate key for item");
            }
            itemKey = item[0];
          } else {
            if (reordering) {
              itemKey = `${JSON.stringify(item)}-${columnIndex}`;
            } else {
              itemKey = itemIndex;
            }
          }
          return `${itemKey}-${columnIndex}`;
        }} />

    </div>
  );
};


interface ItemTableProps extends ItemData, Selection {
  itemCount: number
  fieldKey?: ({ columnIndex, data, rowIndex }: { columnIndex: number, data: ItemData, rowIndex: number }) => string
}
const ItemTable: React.FC<ItemTableProps> =
function ({ itemCount, fields, type, items, selectedCell, onSelectCell, fieldKey, onFieldChange }) {
  const gridEl = useRef<VariableSizeGrid>(null);

  const itemData: CellData = { selectedCell, items, type, onSelectCell, fields, onFieldChange };

  const columnStyles = [
    { width: 50 },
    ...fields.map(() => ({ width: 200 })),
  ];

  return (
    <VariableSizeGrid
        rowCount={itemCount + 1}
        rowHeight={_ => 32}
        itemKey={fieldKey}
        columnCount={fields.length}
        columnWidth={colIndex => columnStyles[colIndex].width}
        itemData={itemData}
        width={300}
        height={200}
        className={styles.datasetContentsTable}
        ref={gridEl}>
      {CellView}
    </VariableSizeGrid>
  );
};


interface ItemSearchWidgetProps {
  onChange: (query?: string) => void
  query?: string
  findingsCount?: number
}
const ItemSearch: React.FC<ItemSearchWidgetProps> = function ({ query, onChange, findingsCount }) {
  return (
    <InputGroup
      fill
      leftIcon="search"
      type="text"
      value={query}
      placeholder="Type to search…"
      rightElement={findingsCount !== undefined ? <>{findingsCount} found</> : undefined}
      onChange={(evt: React.FormEvent<HTMLInputElement>) => onChange(evt.currentTarget.value as string)} />
  );
};


interface ItemData {
  type: 'index' | 'array'
  items: object[] | [string, object][]
  fields: DataObject["fields"]
  onFieldChange?: (itemIndex: number, fieldID: string, newValue: any) => void
}

interface Selection {
  selectedCell?: [number | undefined, number | undefined]
  onSelectCell: (rowIdx: number, colIdx?: number) => void
}

type CellData = ItemData & Selection

const CellView = ({ rowIndex, columnIndex, style, data }: { rowIndex: number, columnIndex: number, style: object, data: CellData }) => {
  const selected = data.selectedCell;
  const onSelect = data.onSelectCell;

  const isSelected = (selected !== undefined && (selected[0] === rowIndex) && (selected[1] === columnIndex));
  const isRowSelected = (selected !== undefined && (selected[0] === rowIndex));

  let cellView: JSX.Element;
  if (rowIndex < 1 && columnIndex < 1) {
    cellView = <>{data.type === 'array' ? "#" : "ID"}</>;

  } else if (rowIndex < 1) {
    cellView = <ColumnHeader field={data.fields[columnIndex - 1]} />;

  } else if (columnIndex < 1) {
    let key: number | string;
    if (data.type === 'array') {
      key = rowIndex - 1;
    } else {
      key = (data.items[rowIndex - 1] as [string, object])[0];
    }
    cellView = <RowHeader itemKey={key} />;

  } else {
    const itemIndex = rowIndex - 1;
    const fieldIndex = columnIndex - 1;
    const item: any = data.items[itemIndex];
    const fieldSpec = data.fields[fieldIndex];

    let value: any;
    if (data.type === 'array') {
      value = item[fieldSpec.id];
    } else {
      value = item[1][fieldSpec.id];
    }

    cellView = <FieldCell
      value={value}
      fieldSpec={fieldSpec}
      onFieldChange={data.onFieldChange
        ? (newValue => data.onFieldChange!(itemIndex, fieldSpec.id, newValue))
        : undefined} />;
  }

  return (
    <div
        style={style}
        className={`
          ${styles.datasetContentsCell}
          ${rowIndex === 0 ? styles.columnHeader : ''}
          ${columnIndex === 0 ? styles.rowHeader : ''}
          ${isSelected ? styles.selected : ''}
          ${isRowSelected ? styles.inSelectedRow : ''}
        `}
        onClick={() => { onSelect(rowIndex, columnIndex) }}>
      {cellView}
    </div>
  );
};


const ColumnHeader: React.FC<{ field: BasicField & DataItem }> = function ({ field }) {
  return <Trans what={field.label} />;
};

const RowHeader: React.FC<{ itemKey: number | string }> = function ({ itemKey }) {
  return <>{itemKey}</>;
};

interface FieldCellProps {
  value: any
  fieldSpec: BasicField & DataItem
  onFieldChange?: (newValue: any) => void
}
const FieldCell: React.FC<FieldCellProps> =
function ({ value, onFieldChange, fieldSpec }) {
  const [ val, setVal ] = useState<any>(value);

  if (fieldSpec.type === 'text') {
    return <EditableText
      type="text"
      value={onFieldChange ? val : value}
      disabled={!onFieldChange}
      onChange={onFieldChange ? setVal : undefined}
      onConfirm={onFieldChange ? (val => onFieldChange(val)) : undefined} />

  } else {
    return <>Unsupported field type</>;
  }
};