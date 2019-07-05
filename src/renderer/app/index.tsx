import * as React from 'react';
// import { useEffect } from 'react';
import { Language } from './localizer';


interface AppProps {
  defaultLang: Language,
  languages: Language[],
  children: any,
}


export function App(props: AppProps): React.ReactElement {
  return (
    <main>
      {props.children || null}
    </main>
  );
}
