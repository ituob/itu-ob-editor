import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { Suspense } from 'react';
import '!style-loader!css-loader!@blueprintjs/core/lib/css/blueprint.css';
import '!style-loader!css-loader!@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import { compose, route, mount, withView, withContext } from 'navi';
import { Router, View } from 'react-navi';
import { App } from './app';
import { IssueScheduler } from './app/issue-scheduler';
import { Workspace } from './app/workspace';


const routes = compose(
  withContext(async (): Promise<{ workspace: Workspace }> => {
    const workspace: Workspace = await Workspace.init();
    return { workspace };
  }),
  withView(req => {
    return (
      <App
        defaultLang={{ id: 'en', title: 'English' }}
        languages={[
          { id: 'en', title: 'English' },
          { id: 'ru', title: 'Russian' }]}>
        <View />
      </App>
    );
  }),
  mount({
    '/': route((req, context: { workspace: Workspace }) => {
      return {
        view: <IssueScheduler workspace={context.workspace} />,
      };
    }),
  }),
);


ReactDOM.render(
  <Router routes={routes}>
    <Suspense fallback={<p>Loading…</p>}>
      <View />
    </Suspense>
  </Router>,
  document.getElementById('app'));
