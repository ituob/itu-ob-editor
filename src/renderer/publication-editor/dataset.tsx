import React, { useContext } from 'react';
import { FormGroup, InputGroup } from '@blueprintjs/core';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { Dataset } from 'models/dataset';
import { EditorViewProps } from './types';


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
    </>
  );
};

export default DatasetMeta;