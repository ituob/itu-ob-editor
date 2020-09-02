import update from 'immutability-helper';
import React, { useState, useRef, useContext, useEffect } from 'react';
import { VariableSizeGrid } from 'react-window';
import { debounce } from 'throttle-debounce';

import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';
import { Trans } from '@riboseinc/coulomb/localizer/renderer/widgets';
import { Translatable } from '@riboseinc/coulomb/localizer/types';

import { PositionDatasets } from 'models/issues';
import * as styles from './styles.scss';
import DatasetMeta from 'renderer/publication-editor/dataset';
import { NonIdealState, InputGroup, ControlGroup, ButtonGroup, Button, EditableText, Tag } from '@blueprintjs/core';
import { ItemList } from 'renderer/widgets/item-list';
import {
  DataArray, DataIndex,
  ArrayStructure, IndexStructure,
  containsArray, containsIndex,
  specifiesIndex, specifiesArray,
  DataObject, DataItem, BasicField,
} from 'models/dataset';
import { ITUTranslator } from 'renderer/machine-translation';


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
        datasetTitle={selectedDataset.meta.title}
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
          // TODO: This use of ItemList is contrived.
          <ItemList
            key={idx}
            title={dataset.meta.title ? `“${dataset.meta.title[lang.selected]}”` : idx}
            items={{
              'spec': "Settings",
              'contents': <>Content&emsp;<Tag round title="Dataset items">{Object.entries(dataset.contents).length}</Tag></>,
            }}
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

type ArrayDataset = DataArray & { item: DataObject };

interface DatasetContentsEditorProps<Schema extends ArrayDataset | DataIndex> {
  datasetTitle?: Translatable<string>
  schema: ArrayDataset | DataIndex
  data: Schema extends ArrayDataset ? ArrayStructure : IndexStructure
  onChange?: (data: Schema extends ArrayDataset ? ArrayStructure : IndexStructure) => void
}
export const DatasetContents: React.FC<DatasetContentsEditorProps<any>> =
function ({ datasetTitle, schema, data, onChange }) {
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
    list = filterArray(data as ArrayStructure, searchQuery || '');
  } else {
    const index = data as IndexStructure;
    list = Object.entries(filterIndex(index, searchQuery || '')).sort(([idx1, _1], [idx2, _2]) => idx1.localeCompare(idx2));
  }

  function sanitizeQuery(q: string) {
    return q.trim().toLowerCase();
  }

  function itemMatchesQuery(q: string, item: any) {
    const fieldMatches: boolean[] = schema.item.fields.map(f => {
      const valRaw = item[f.id];
      let valStr: string;
      if (f.type === 'text' || f.type === 'number') {
        valStr = `${valRaw || ''}`;
      } else if (f.type === 'translated-text') {
        valStr = `${(valRaw || {})[lang.selected] || ''}`;
      } else if (f.type === 'boolean') {
        valStr = `${valRaw === true ? 'true' : 'false'}`;
      } else {
        valStr = JSON.stringify(valRaw);
      }
      const val = valStr.toLowerCase();
      if (val === q || val.indexOf(q.trim()) >= 0) {
        return true;
      } else {
        return false;
      }
    });
    return fieldMatches.indexOf(true) >= 0;
  }

  function filterArray(data: ArrayStructure, withQuery: string): ArrayStructure {
    const q = sanitizeQuery(withQuery);

    if (q === '') { return data; }

    return data.filter((item: any) => itemMatchesQuery(q, item));
  }

  function filterIndex(data: IndexStructure, withQuery: string): IndexStructure {
    const q = sanitizeQuery(withQuery);

    if (q === '') { return data; }

    const keys = Object.keys(data);

    const matchingKeys = keys.filter(k => {
      if (k.indexOf(q) >= 0) {
        return true;
      } else {
        return itemMatchesQuery(q, data[k]);
      }
    });

    const excludedKeys = keys.filter(k => matchingKeys.indexOf(k) < 0);
    return update(data, { $unset: excludedKeys });
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
      setReordering(true);
      onChange(update(data, { $splice: [[atIdx, 0, createItemStub()]] }));
      setImmediate(() => setReordering(false));
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
      setReordering(true);
      onChange(update(data, { $splice: [[selectedArrayIndex, 1]] }));
      setImmediate(() => setReordering(false));
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
        <ItemSearch
          query={searchQuery}
          onChange={setSearchQuery}
          findingsCount={undefined} />
      </ControlGroup>

      <ItemTable
        onSelectCell={(row, col) => { selectRowIdx(row); selectColIdx(col); }}
        selectedCell={[selectedRowIdx, selectedColIdx]}
        datasetTitle={datasetTitle}
        lang={lang.selected}
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
function ({ datasetTitle, itemCount, fields, type, items, selectedCell, onSelectCell, fieldKey, onFieldChange }) {
  const gridEl = useRef<VariableSizeGrid>(null);
  const lang = useContext(LangConfigContext);

  const itemData: CellData = {
    selectedCell,
    items,
    type,
    onSelectCell,
    fields,
    onFieldChange,
    datasetTitle,
    lang: lang.selected,
  };

  const [tableDimensions, setTableDimensions] = useState<[number, number]>([200, 200]); // width, height
  const tableWrapper = useRef<HTMLDivElement>(null);
  const tableEl = useRef<VariableSizeGrid>(null);

  useEffect(() => {
    const updateTableDimensions = debounce(40, () => {
      const dimensions = [
        tableWrapper.current?.parentElement?.offsetWidth || 200,
        tableWrapper.current?.parentElement?.getBoundingClientRect()?.height || 200,
      ];

      setTableDimensions([
        dimensions[0] - 20,
        dimensions[1] - 70,
      ]);

      setImmediate(() => {
        if (selectedCell) {
          scrollTo(selectedCell);
        }
      });
    });

    window.addEventListener('resize', updateTableDimensions);

    updateTableDimensions();

    return function cleanup() {
      window.removeEventListener('resize', updateTableDimensions);
    }
  }, [tableWrapper.current]);

  useEffect(() => {
    if (selectedCell !== undefined) {
      scrollTo(selectedCell);
    }
  }, [JSON.stringify(selectedCell)]);

  function scrollTo(cell: [number | undefined, number | undefined]) {
    if (tableEl && tableEl.current) {
      tableEl.current.scrollToItem({
        align: 'smart',
        columnIndex: cell[0],
        rowIndex: cell[1],
      });
    }
  }

  const columnStyles = [
    { width: type === 'array' ? 50 : 150 },
    ...fields.map(() => ({ width: 200 })),
  ];

  return (
    <div
        className={styles.datasetContentsTableWrapper}
        ref={tableWrapper}>
      <VariableSizeGrid
          rowCount={itemCount + 1}
          rowHeight={_ => 32}
          itemKey={fieldKey}
          columnCount={fields.length + 1}
          columnWidth={colIndex => columnStyles[colIndex].width}
          itemData={itemData}
          width={tableDimensions[0]}
          height={tableDimensions[1]}
          className={styles.datasetContentsTable}
          ref={gridEl}>
        {CellView}
      </VariableSizeGrid>
    </div>
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
      value={query || ''}
      placeholder="Type to search…"
      rightElement={findingsCount !== undefined ? <>{findingsCount} found</> : undefined}
      onChange={(evt: React.FormEvent<HTMLInputElement>) => onChange(evt.currentTarget.value as string)} />
  );
};


interface ItemData {
  type: 'index' | 'array'
  items: object[] | [string, object][]
  fields: DataObject["fields"]
  datasetTitle?: Translatable<string>
  lang: string
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

  let tooltip: string;
  let cellView: JSX.Element;
  if (rowIndex < 1 && columnIndex < 1) {
    cellView = <>{data.type === 'array'
      ? "#"
      : ((data.datasetTitle || {})[data.lang] || "ID")}</>;
    tooltip = '';

  } else if (rowIndex < 1) {
    const field = data.fields[columnIndex - 1];
    cellView = <ColumnHeader field={field} />;
    tooltip = field.label[data.lang];

  } else if (columnIndex < 1) {
    let key: number | string;
    if (data.type === 'array') {
      key = rowIndex - 1;
    } else {
      key = (data.items[rowIndex - 1] as [string, object])[0];
    }
    cellView = <RowHeader itemKey={key} />;
    tooltip = `Item #${key}`;

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

    tooltip = JSON.stringify(value);

    cellView = <FieldCell
      value={value}
      fieldSpec={fieldSpec}
      onFieldChange={data.onFieldChange
        ? (newValue => data.onFieldChange!(itemIndex, fieldSpec.id, newValue))
        : undefined} />;
  }

  return (
    <div
        title={tooltip}
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
  const [val, setVal] = useState<any>(value);
  const lang = useContext(LangConfigContext);

  if (fieldSpec.type === 'text' || fieldSpec.type === 'number') {
    return <EditableText
      type={fieldSpec.type}
      value={(onFieldChange ? val : value) || ''}
      disabled={!onFieldChange}
      onChange={onFieldChange ? setVal : undefined}
      onConfirm={onFieldChange ? (val => onFieldChange(val)) : undefined} />

  } else if (fieldSpec.type === 'translated-text') {
    const translatable = val as Translatable<string> || { [lang.selected]: '' };

    return  <InputGroup
        type="text"
        rightElement={
          <ButtonGroup>
            {onFieldChange !== undefined && lang.default !== lang.selected && (!val || !val[lang.selected])
              ? <Button small minimal
                  title="ITU magic translate"
                  onClick={async () => {
                    const translated = await translator.translate(
                      translatable[lang.default],
                      lang.default,
                      lang.selected);
                    const newVal = { ...val, [lang.selected]: translated };
                    setVal(newVal);
                    onFieldChange(newVal);
                  }}
                  icon="clean" />
              : undefined}
            <Button small minimal disabled>{lang.selected}</Button>
          </ButtonGroup>
        }
        small
        className={styles.translatedTextInput}
        value={translatable[lang.selected]}
        disabled={!onFieldChange}
        onChange={onFieldChange
          ? (evt: React.FormEvent<HTMLInputElement>) => setVal({
              ...val,
              [lang.selected]: evt.currentTarget.value,
            })
          : undefined}
        onBlur={onFieldChange ? (() => onFieldChange(val)) : undefined} />;

  } else {
    return <span className={styles.unsupportedField}>
      {JSON.stringify(value)}
    </span>;
  }
};


const translator = new ITUTranslator();
