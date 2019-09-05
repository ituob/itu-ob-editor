import * as path from 'path';
import * as fs from 'fs-extra';
import * as git from 'isomorphic-git';


interface GitAuthentication {
  oauth2format?: 'github' | 'gitlab' | 'bitbucket',
  token?: string,
  username?: string,
  password?: string,
}


export interface GitAuthor {
  name?: string,
  email?: string,
}


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
