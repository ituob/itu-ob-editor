import { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useTimeTravel, TimeTravel } from 'renderer/app/useTimeTravel';
import { reviveJsonValue } from 'main/storage/api';


// TODO (#4): Refactor into generic main APIs, rather than Workspace-centered


export async function apiRequest<T>(request: string, ...args: string[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    function handleResp(evt: any, rawData: string) {
      ipcRenderer.removeListener(`workspace-${request}`, handleResp);
      const data: T = JSON.parse(rawData, reviveJsonValue);
      resolve(data);
    }
    ipcRenderer.on(`workspace-${request}`, handleResp);
    ipcRenderer.send(`request-workspace-${request}`, ...args);
  });
}


/* React hooks */

export function useWorkspace<T>(request: string, reducer: any, initData: T, ...args: string[]) {
  function storeData(data: any) {
    ipcRenderer.send(`store-workspace-${request}`, ...args, JSON.stringify(data));
  }

  const tt: TimeTravel = useTimeTravel(storeData, reducer, initData);

  useEffect(() => {

    // useEffect, at least per TS bindings, doesn’t allow async callbacks,
    // so let’s wrap this in a function
    (async () => tt.dispatch({
      type: 'FETCH_DATA',
      data: await apiRequest<T>(request, ...args),
    }))();

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
