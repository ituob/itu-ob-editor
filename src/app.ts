import { AppConfig } from '@riboseinc/coulomb/config/app';
import { AvailableLanguages } from 'models/languages';


const isDevelopment = process.env.NODE_ENV !== 'production';


let APP_HELP_ROOT: string;
if (!isDevelopment) {
  APP_HELP_ROOT = "https://www.ituob.org/_app_help/";
} else {
  APP_HELP_ROOT = "http://ituob.org:5001/_app_help/";
}

export const defaultLanguage: keyof typeof AvailableLanguages = 'en';

export const defaultISSN = '1564-5223';

export const availableLanguages = AvailableLanguages;

export const conf: AppConfig = {
  data: {
    issues: {
      shortName: 'OB',
      verboseName: 'operational bulletin issue',
      verboseNamePlural: 'operational bulletin issues',
    },
    publications: {
      shortName: 'SP',
      verboseName: 'service publication',
      verboseNamePlural: 'service publications',
    },
    recommendations: {
      shortName: 'Rec.',
      verboseName: 'recommendation',
      verboseNamePlural: 'recommendations',
    },
  },

  databases: {
    default: {
      verboseName: 'ITU OB DB',
    }
  },

  help: {
    rootURL: APP_HELP_ROOT,
  },

  windows: {
    default: {
      openerParams: {
        title: 'ITU OB Editor',
        dimensions: { width: 800, height: 550, minWidth: 800, minHeight: 550 },
      },
    },
    issueEditor: {
      openerParams: {
        title: 'ITU OB Editor: Issue',
        dimensions: { width: 1050, height: 700, minWidth: 700, minHeight: 500 },
      },
    },
    publicationEditor: {
      openerParams: {
        title: 'ITU OB Editor: Publication',
        dimensions: { width: 800, height: 500, minWidth: 750, minHeight: 400 },
      },
    },
    batchCommit: {
      openerParams: {
        title: 'ITU OB Editor: Commit changes',
        dimensions: { width: 800, height: 700, minWidth: 800, minHeight: 500 },
      },
    },
    settings: {
      openerParams: {
        title: 'ITU OB Editor: Settings',
        dimensions: { width: 800, height: 500, minWidth: 800, minHeight: 500 },
      },
    },
  },
  settingsWindowID: 'settings',
};