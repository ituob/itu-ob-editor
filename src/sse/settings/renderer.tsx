import { ipcRenderer } from 'electron';
import { useEffect, useState } from 'react';


export function useSetting<T>(name: string, initialValue: T) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    ipcRenderer.once('get-setting', handleSettingResponse);
    return function cleanup() {
      ipcRenderer.removeListener('get-setting', handleSettingResponse);
    }
  }, []);

  function handleSettingResponse(evt: any, value: any) {
    setValue(value as T);
  }

  async function commit() {
    await ipcRenderer.send('set-setting', name, value);
  }

  return {
    value: value,
    set: setValue,
    commit: commit,
  };
}
