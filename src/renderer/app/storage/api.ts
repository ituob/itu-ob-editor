import { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useTimeTravel, TimeTravel } from 'renderer/app/useTimeTravel';
import { reviveJsonValue } from 'main/storage/api';


export function useWorkspace<T>(request: string, reducer: any, initData: T, ...args: string[]) {
  function storeData(data: any) {
    ipcRenderer.send(`store-workspace-${request}`, ...args, JSON.stringify(data));
  }

  const tt: TimeTravel = useTimeTravel(storeData, reducer, initData);

  useEffect(() => {

    function handleNewData(evt: any, rawData: string) {
      ipcRenderer.removeListener(`workspace-${request}`, handleNewData);
      const data: T = JSON.parse(rawData, reviveJsonValue);
      tt.dispatch({ type: 'FETCH_DATA', data: data });
    }

    function getData() {
      ipcRenderer.on(`workspace-${request}`, handleNewData);
      ipcRenderer.send(`request-workspace-${request}`, ...args);
    }

    getData();
    return undefined;

  }, [request, JSON.stringify(tt.timeline.present)]);

  return tt;
}


export function useWorkspaceRO<T>(request: string, initData: T, poll: boolean = false) {
  const [data, updateData] = useState(initData);

  useEffect(() => {
    function handleNewData(evt: any, rawData: string) {
      ipcRenderer.removeListener(`workspace-${request}`, handleNewData);
      const data: T = JSON.parse(rawData, reviveJsonValue);
      updateData(data);
    }

    function getData() {
      ipcRenderer.on(`workspace-${request}`, handleNewData);
      ipcRenderer.send(`request-workspace-${request}`);
    }

    if (poll === true) {
      getData();
      const interval = setInterval(getData, 5000);
      return function cleanup() {
        clearInterval(interval);
      };
    } else {
      getData();
      return undefined;
    }
  }, [request]);

  return data;
}
