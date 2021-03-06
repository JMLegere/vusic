import fs from 'mz/fs';
import * as io from '@/modules/cerialize';
import path from 'path';
import { remote } from 'electron';

import { Module as Mod } from 'vuex';
import { Mutation, Action, Module, getModule } from 'vuex-module-decorators';

import store from '@/store/store';
import { APPLICATION_PATH } from '@/constants';
import { VuexModule } from '@/store/utils';

const CACHE_PATH = path.join(APPLICATION_PATH, 'cache.json');

// TODO Remove store stuff
/**
 * This module contains information about the application that does not change between projects.
 */
@Module({ dynamic: true, store, name: 'cache' })
export class Cache extends VuexModule {
  @io.auto({ nullable: true }) public openedFile: string | null = null;
  @io.auto({ nullable: true }) public backupTempPath: string | null = null;
  @io.auto({ nullable: true }) public microphoneIn: string | null = null;
  @io.auto public folders: string[] = [];

  constructor(module?: Mod<any, any>) {
    super(module || {});
  }

  @Action
  public openFolder() {
    const { dialog } = remote;
    const folders = dialog.showOpenDialog({ properties: ['openDirectory'] });

    // We should only ever get undefined or an array of length 1
    if (!folders || folders.length === 0) {
      return;
    }


    const folder = folders[0];
    this.addFolder(folder);
  }

  /**
   * Load in the cache from the default file location.
   */
  @Action
  public async fromCacheFolder() {
    if (!(await fs.exists(CACHE_PATH))) {
      await this.writeCache();
    }

    const contents = (await fs.readFile(CACHE_PATH)).toString();

    let json;
    try {
      json = JSON.parse(contents);
    } catch (e) {
      // Write current cache to the file if we can't parse the contents
      this.writeCache();
      return;
    }

    const decoded = io.deserialize(json, Cache);
    this.reset(decoded);
  }

  @Mutation
  public reset(o: Cache) {
    Object.assign(this, o);
  }

  @Action
  public setOpenedFile(openedFile: string | null) {
    this.set({ key: 'openedFile', value: openedFile });
    return this.writeCache();
  }

  @Action
  public setBackupTempPath(tempPath: string | null) {
    this.set({ key: 'backupTempPath', value: tempPath });
    this.writeCache();
  }

  @Action
  public setFolders(folders: string[]) {
    this.set({ key: 'folders', value: folders });
    return this.writeCache();
  }

  @Action
  public setMicrophoneIn(label: string) {
    this.set({ key: 'microphoneIn', value: label});
    return this.writeCache();
  }

  @Action
  public addFolder(folder: string) {
    if (this.folders.indexOf(folder) !== -1) {
      return;
    }

    this.set({ key: 'folders', value: [...this.folders, folder] });
    return this.writeCache();
  }

  @Action
  public removeFolder(target: string) {
    this.set({ key: 'folders', value: this.folders.filter((folder) => folder !== target) });
    return this.writeCache();
  }

  /**
   * This used to be called `write`, but somehow the `write` method in `workspace` was being called...
   */
  @Action
  public async writeCache() {
    const c = io.serialize(this, Cache);
    const dir = path.dirname(CACHE_PATH);
    if (!await fs.exists(dir)) {
      await fs.mkdir(dir);
    }

    return fs.writeFile(CACHE_PATH, JSON.stringify(c, null, 4));
  }
}
export default getModule(Cache);
