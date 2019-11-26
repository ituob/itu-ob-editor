import * as path from 'path';
import { MainStorage as BaseMainStorage } from 'sse/storage/main';
import { GitFilesystemStore } from 'sse/storage/main/store/git-filesystem';
import { YAMLDirectoryBackend } from 'sse/storage/main/filesystem/yaml';
import { GitController } from 'sse/storage/main/git/controller';

import { ScheduledIssue } from 'models/issues';
import { Storage } from '.';


type OBIssue = Storage['issues'];


class OBIssueStore extends GitFilesystemStore<OBIssue, YAMLDirectoryBackend, number> {
  public async schedule(obj: ScheduledIssue) {
    return await this.create(obj as OBIssue, `scheduled OB ${obj.id}`);
  }
}


export interface MainStorage extends BaseMainStorage<Storage> {
  recommendations: GitFilesystemStore<Storage['recommendations'], YAMLDirectoryBackend, string>,
  publications: GitFilesystemStore<Storage['publications'], YAMLDirectoryBackend, string>,
  issues: OBIssueStore,
}


export function getStorage(gitCtrl: GitController): MainStorage {

  const storage: MainStorage = {
    recommendations: new GitFilesystemStore(
      'rec.',
      new YAMLDirectoryBackend(
        path.join(gitCtrl.workDir, 'recommendations'),
        ['code', 'title', 'alias']),
      gitCtrl,
      'code'),

    publications: new GitFilesystemStore(
      'pub.',
      new YAMLDirectoryBackend(
        path.join(gitCtrl.workDir, 'lists'),
        ['id', 'url', 'title', 'recommendation']),
      gitCtrl),

    issues: new OBIssueStore(
      'OB',
      new YAMLDirectoryBackend(
        path.join(gitCtrl.workDir, 'issues'),
        ['id', 'publication_date', 'cutoff_date', 'issn', 'languages', 'authors']),
      gitCtrl),
  }

  return storage;
}
