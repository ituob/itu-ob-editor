import * as React from 'react';
// import { useEffect } from 'react';
import { Language } from './localizer';


interface AppProps {
  defaultLang: Language,
  languages: Language[],
  children: any,
}


export function App(props: AppProps): React.ReactElement {
  // useEffect(() => {
  //   (async function () {
  //     const wsState = await workspace.loadState();

  //     dispatch({
  //       type: 'FETCH_DATA',
  //       publications: wsState.publications,
  //       issues: wsState.issues,
  //     });

  //     window.setTimeout(() => {
  //       dispatch({
  //         type: 'UPDATE_ISSUE_SCHEDULE',
  //         id: 1173,
  //         publication_date: new Date('2019-08-20'),
  //         cutoff_date: new Date('2019-08-10'),
  //       });
  //     }, 5000);
  //   })();
  // }, []);

  return (
    <main>
      {props.children || null}
    </main>
  );
}
