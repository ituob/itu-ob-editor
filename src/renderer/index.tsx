import { RendererConfig } from 'coulomb/config/renderer';
import { renderApp } from 'coulomb/app/renderer';
import { conf as appConf, availableLanguages, defaultLanguage } from '../app';


export const conf: RendererConfig<typeof appConf> = {
  app: appConf,

  windowComponents: {
    default: () => import('./home'),
    issueEditor: () => import('./issue-editor'),
    publicationEditor: () => import('./publication-editor'),
    batchCommit: () => import('./batch-commit'),
    settings: () => import('coulomb/settings/renderer'),
  },

  objectEditorWindows: {
    issues: 'issueEditor',
    publications: 'publicationEditor',
  },

  databaseStatusComponents: {
    default: () => import('coulomb/db/isogit-yaml/renderer/status'),
  },

  contextProviders: [{
    cls: () => import('coulomb/localizer/renderer/context-provider'),
    getProps: () => ({
      available: availableLanguages,
      selected: defaultLanguage,
      default: defaultLanguage,
    }),
  }],
};


export const app = renderApp<typeof appConf, typeof conf>(conf);