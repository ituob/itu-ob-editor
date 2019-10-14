import * as fs from 'fs-extra';
import * as path from 'path';

import { app } from 'electron';

import { YAMLStorage } from 'sse/storage/main/yaml';


const WORK_DIR = path.join(app.getPath('userData'));
const SETTINGS_PATH = path.join(WORK_DIR, 'itu-ob-settings.yaml');


export interface Pane {
  id: string;
  label: string;
  icon?: string;
}


export class Setting<T> {
  constructor(public id: string, public label: string, public paneId: string) {}
  toUseable(val: unknown): T { return val as T };
  toStoreable(val: T): any { return val as any };
}


class SettingManager {
  private registry: Setting<any>[] = [];
  private panes: Pane[] = [];
  private data: any | null = null;

  constructor(private yaml: YAMLStorage) {}

  public async getValue<S extends Setting<any>>(id: string): Promise<unknown> {
    const setting = this.get(id) as S;

    if (setting) {
      if (!this.data) {
        let settingsFileExists: boolean;
        try {
          settingsFileExists = (await fs.stat(SETTINGS_PATH)).isFile();
        } catch (e) {
          settingsFileExists = false;
        }
        if (settingsFileExists) {
          this.data = await this.yaml.load(SETTINGS_PATH);
        } else {
          this.data = {};
        }
      }
      return setting.toUseable(this.data[id]);
    } else {
      throw new Error(`Setting is not found: ${id}`);
    }
  }

  public async setValue<S extends Setting<any>>(id: string, val: unknown) {
    const storeable = (this.get(id) as S).toStoreable(val);
    this.data[id] = storeable;
    await this.yaml.store(SETTINGS_PATH, this.data);
  }

  private get(id: string): Setting<any> | undefined {
    return this.registry.find(s => s.id === id);
  }

  public register(setting: Setting<any>) {
    if (this.panes.find(p => p.id === setting.paneId)) {
      this.registry.push(setting);
    } else {
      throw new Error("Invalid pane ID");
    }
  }

  public configurePane(pane: Pane) {
    this.panes.push(pane);
  }
}


export const manager = new SettingManager(new YAMLStorage(fs));
