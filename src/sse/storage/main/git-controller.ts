import * as path from 'path';
import * as fs from 'fs-extra';
import * as git from 'isomorphic-git';

import { ipcMain } from 'electron';

import { makeEndpoint } from 'sse/api/main';
import { Setting, manager as settings } from 'sse/settings/main';
import { makeWindowEndpoint } from 'sse/api/main';
import { openWindow } from 'sse/main/window';

import { GitAuthor, GitAuthentication } from '../git';


export class GitController {
  private auth: GitAuthentication = {};

  constructor(
      private fs: any,
      private repoUrl: string,
      private workDir: string,
      private corsProxy: string) {

    git.plugins.set('fs', fs);
  }

  async getAuthor(): Promise<GitAuthor> {
    const name = await git.config({ dir: this.workDir, path: 'user.name' });
    const email = await git.config({ dir: this.workDir, path: 'user.email' });
    return { name: name, email: email };
  }

  async setAuthor(author: GitAuthor) {
    await git.config({ dir: this.workDir, path: 'user.name', value: author.name });
    await git.config({ dir: this.workDir, path: 'user.email', value: author.email });
  }

  async setAuth(auth: GitAuthentication): Promise<boolean> {
    try {
      // Try fetching with auth; will throw if auth is invalid
      git.fetch({dir: this.workDir, ...auth });
    } catch (e) {
      return false;
    }

    this.auth = auth;
    return true;
  }

  async isInitialized(): Promise<boolean> {
    let gitInitialized: boolean;

    try {
      gitInitialized = (await this.fs.stat(path.join(this.workDir, '.git'))).isDirectory();
    } catch (e) {
      gitInitialized = false;
    }

    return gitInitialized;
  }

  async getOriginUrl(): Promise<string | undefined> {
    return ((await git.listRemotes({
      dir: this.workDir,
    })).find(r => r.remote === 'origin') || { url: undefined }).url;
  }

  async addAllChanges() {
    await git.add({
      dir: this.workDir,
      filepath: '.',
    });
  }

  async listChangedFiles(): Promise<string[]> {
    const FILE = 0, HEAD = 1, WORKDIR = 2;

    return (await git.statusMatrix({ dir: this.workDir }))
      .filter(row => row[HEAD] !== row[WORKDIR])
      .map(row => row[FILE]);
  }

  async pull() {
    await git.pull({
      dir: this.workDir,
      ref: 'master',
      singleBranch: true,
      fastForwardOnly: true,
      ...this.auth,
    });
  }

  async commit(msg: string) {
    await git.commit({
      dir: this.workDir,
      message: msg,
      author: {},
    });
  }

  async push() {
    await git.push({
      dir: this.workDir,
      remote: 'origin',
      ...this.auth,
    });
  }

  async reset() {
    await this.fs.remove(this.workDir);
    await this.fs.ensureDir(this.workDir);
    await git.clone({
      dir: this.workDir,
      url: this.repoUrl,
      ref: 'master',
      singleBranch: true,
      depth: 10,
      corsProxy: this.corsProxy,
      ...this.auth,
    });
  }

  setUpAPIEndpoints() {

    makeEndpoint<{ name?: string, email?: string }>('git-author-info', async () => {
      return (await this.getAuthor());
    });

    makeEndpoint<{ errors: string[] }>('fetch-commit-push', async ({
        commitMsg,
        authorName,
        authorEmail,
        gitUsername,
        gitPassword,
      }: {
        commitMsg: string,
        authorName: string,
        authorEmail: string,
        gitUsername: string,
        gitPassword: string
      }) => {

      await this.setAuthor({ name: authorName, email: authorEmail });

      try {
        await this.setAuth({ username: gitUsername, password: gitPassword });
      } catch (e) {
        return { errors: [`Error while authenticating: ${e.toString()}`] };
      }

      try {
        await this.pull();
      } catch (e) {
        return { errors: [`Error while fetching and merging changes: ${e.toString()}`] };
      }

      const changedFiles = await this.listChangedFiles();
      if (changedFiles.length < 1) {
        return { errors: ["No changes to submit!"] };
      }

      await this.addAllChanges();
      await this.commit(commitMsg);

      try {
        await this.push();
      } catch (e) {
        return { errors: [`Error while pushing changes: ${e.toString()}`] };
      }

      return { errors: [] };
    });

  }
}


export async function initRepo(
    workDir: string,
    repoUrl: string,
    corsProxyUrl: string): Promise<GitController> {

  const gitCtrl = new GitController(fs, repoUrl, workDir, corsProxyUrl);

  if (!(await gitCtrl.isInitialized())) {
    await gitCtrl.reset();
  } else {
    await gitCtrl.pull();
  }

  return gitCtrl;
}


class GitRepoURLSetting extends Setting<string> {
  toUseable(val: string) {
    return val;
  }
}

settings.configurePane({
  id: 'dataSync',
  label: "Data synchronization",
  icon: 'git-merge',
});


settings.register(new Setting<string>(
  'gitRepoUrl',
  "Git repository URL",
  'dataSync',
));


/* Promises to return a string containing configured repository URL.
   If repository URL is not configured (e.g., on first run, or after reset)
   opens a window asking the user to specify the URL. */
export async function setRepoUrl(defaultUrl?: string): Promise<string> {
  const repoUrl: string = await settings.getValue<GitRepoURLSetting>('gitRepoUrl') as string;
  const REPO_CONFIG_WINDOW_OPTS = {
    component: 'repoConfig',
    title: 'Repository Configuration',
    componentParams: `defaultUrl=${defaultUrl || ''}&currentUrl=${repoUrl || ''}`,
    dimensions: { width: 800, height: 550 },
  };

  makeWindowEndpoint('repo-configuration', () => REPO_CONFIG_WINDOW_OPTS);

  return new Promise<string>(async (resolve, reject) => {
    if (!repoUrl) {
      await openWindow(REPO_CONFIG_WINDOW_OPTS);

      ipcMain.on('set-setting', (evt: any, name: string, value: string) => {
        if (name === 'repoUrl') {
          resolve(value);
        }
      });
    } else {
      resolve(repoUrl);
    }
  });
}
