import { RendererConfig } from '@riboseinc/coulomb/config/renderer';
import { renderApp } from '@riboseinc/coulomb/app/renderer';
import { conf as appConf, availableLanguages, defaultLanguage } from '../app';


export const conf: RendererConfig<typeof appConf> = {
  app: appConf,

  windowComponents: {
    default: () => import('./home'),
    issueEditor: () => import('./issue-editor'),
    publicationEditor: () => import('./publication-editor'),
    batchCommit: () => import('./batch-commit'),
    settings: () => import('@riboseinc/coulomb/settings/renderer'),
  },

  objectEditorWindows: {
    issues: 'issueEditor',
    publications: 'publicationEditor',
  },

  databaseStatusComponents: {
    default: () => import('@riboseinc/coulomb/db/isogit-yaml/renderer/status'),
  },

  contextProviders: [{
    cls: () => import('@riboseinc/coulomb/localizer/renderer/context-provider'),
    getProps: async () => ({
      available: availableLanguages,
      selected: defaultLanguage,
      default: defaultLanguage,
    }),
  }, {
    cls: () => import('@riboseinc/coulomb/db/renderer/single-db-status-context-provider'),
    getProps: async () => ({ dbName: 'default' }),
  }],
};


export const app = renderApp<typeof appConf, typeof conf>(conf);
