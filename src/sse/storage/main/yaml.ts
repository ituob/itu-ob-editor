import * as yaml from 'js-yaml';
import { customTimestampType } from './yaml-custom-ts';


export class YAMLStorage {
  constructor(private fs: any) { }

  public async load(filePath: string): Promise<any> {
    const data: string = await this.fs.readFile(filePath, { encoding: 'utf8' });
    return yaml.load(data, { schema: SCHEMA });
  }

  private async loadIfExists(filePath: string): Promise<any> {
    let fileExists: boolean;
    let oldData: any;

    try {
      fileExists = (await this.fs.stat(filePath)).isFile() === true;
    } catch (e) {
      fileExists = false;
    }

    if (fileExists) {
      oldData = await this.load(filePath);
    } else {
      oldData = {};
    }

    return oldData || {};
  }

  public async store(filePath: string, data: any): Promise<any> {
    if (data !== undefined && data !== null) {
      // Merge new data into old data; this way if some YAML properties
      // are not supported we will not lose them after the update.
      let newData: any;
      let oldData: any;
      let newContents: string;

      try {
        oldData = await this.loadIfExists(filePath);
        newData = Object.assign(oldData, data);
      } catch (e) {
        console.error("Bad input", filePath, oldData, data);
        throw e;
      }

      // console.debug(`Dumping contents for ${filePath} from ${data}`);
      // console.debug(oldData);

      try {
        newContents = yaml.dump(newData, {
          schema: SCHEMA,
          noRefs: true,
          noCompatMode: true,
        });
      } catch (e) {
        console.error(`Failed to save ${filePath} with ${JSON.stringify(newData)}`);
        return;
      }

      // console.debug(`Writing to ${filePath}, file exists: ${fileExists}`);

      // if (fileExists) {
      //   const oldContents: string = await this.fs.readFile(filePath, { encoding: 'utf8' });
      //   console.debug(`Replacing contents of ${filePath}`, oldContents, newContents);
      // }

      await this.fs.writeFile(filePath, newContents, { encoding: 'utf8' });
      return data;
    } else {
      await this.fs.remove(filePath);
    }
  }
}


const SCHEMA = new yaml.Schema({
  include: [yaml.DEFAULT_SAFE_SCHEMA],

  // Trick because js-yaml API appears to not support augmenting implicit tags
  implicit: [
    ...(yaml.DEFAULT_SAFE_SCHEMA as any).implicit,
    ...[customTimestampType],
  ],
});
