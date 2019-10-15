import * as fs from 'fs-extra';
import * as path from 'path';

import { app, ipcMain } from 'electron';

import { YAMLStorage } from 'sse/storage/main/yaml';


const WORK_DIR = path.join(app.getPath('userData'));
const SETTINGS_PATH = path.join(WORK_DIR, 'itu-ob-settings.yaml');


export interface Pane {
  id: string;
  label: string;
  icon?: string;
}


export class Setting<T> {
  constructor(
    public id: string,
    public label: string,
    public paneId: string) {}
  toUseable(val: unknown): T { return val as T };
  toStoreable(val: T): any { return val as any };
}


class SettingManager {
  private registry: Setting<any>[] = [];
  private panes: Pane[] = [];
  private data: any | null = null;

  constructor(private yaml: YAMLStorage) {}

  public async getValue(id: string): Promise<unknown> {
    const setting = this.get(id);

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
      const rawVal = this.data[id];
      return rawVal !== undefined ? setting.toUseable(rawVal) : undefined;
    } else {
      throw new Error(`Setting to get value for is not found: ${id}`);
    }
  }

  public async setValue(id: string, val: unknown) {
    const setting = this.get(id);
    if (setting) {
      const storeable = setting.toStoreable(val);
      this.data[id] = storeable;
      await this.commit();
    } else {
      throw new Error(`Setting to set value for is not found: ${id}`);
    }
  }

  public async deleteValue(id: string) {
    delete this.data[id];
    await this.commit();
  }

  private async commit() {
    await fs.remove(SETTINGS_PATH);
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

  public setUpAPIEndpoints() {
    ipcMain.on('set-setting', (evt: any, name: string, value: any) => {
      return this.setValue(name, value);
    });

    ipcMain.on('get-setting', (evt: any, name: string) => {
      const value = this.getValue(name);
      evt.reply(value);
    });

    ipcMain.on('clear-setting', async (evt: any, name: string) => {
      await this.deleteValue(name);
      evt.reply('ok');
    });
  }
}


export const manager = new SettingManager(new YAMLStorage(fs));
