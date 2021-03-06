<template>
  <v-app class="app">
    <split direction="vertical">
      <split :initial="30" fixed>
        <menu-bar 
          :menu="menu"
          :maximized="maximized"
          @close="closeApplication"
          @minimize="minimizeApplication"
          @maximize="maximizeApplication"
          @restore="restoreApplication"
        ></menu-bar>
      </split>

      <split direction="horizontal" resizable>
        <split :initial="65" fixed>
          <activity-bar></activity-bar>
        </split>

        <split 
          collapsible 
          :min-size="100"
          :initial="workspace.sideBarSize"
          @resize="workspace.setSideBarSize"
        >
          <side-tabs 
            v-if="loaded"
            :style="border('right')"
          ></side-tabs>
          <blank v-else></blank>
        </split>

        <split direction="vertical" resizable>

          <split :initial="general.toolbarHeight" fixed>
            <toolbar
              class="toolbar"
              :height="general.toolbarHeight"
              :transport="transport"
              :context="workspace.applicationContext"
              @update:context="setContext"
              :play="general.play"
              @update:play="playPause"
              :style="border('bottom')"
              :bpm="general.project.bpm"
              @update:bpm="(bpm) => general.project.setBpm(bpm)"
            ></toolbar>
          </split>

          <split>
            <playlist-sequencer
              v-if="loaded"
              style="height: 100%"
              :tracks="general.project.tracks" 
              :elements="general.project.master.elements"
              :transport="general.project.master.transport"
              :play="playlistPlay"
              :start.sync="masterStart"
              :end.sync="masterEnd"
              :steps-per-beat="general.project.stepsPerBeat"
              :beats-per-measure="general.project.beatsPerMeasure"
              :row-height="workspace.playlistRowHeight"
              @update:rowHeight="workspace.setPlaylistRowHeight"
              :px-per-beat="workspace.playlistBeatWidth"
              @update:pxPerBeat="workspace.setPlaylistBeatWidth"
              @new-prototype="checkPrototype"
              @record="record"
              :is-recording="general.isRecordingMicrophone"
              :ghosts="ghosts"
            ></playlist-sequencer>
            <blank v-else></blank>              
          </split>

          <split
            class="secondary" 
            direction="vertical"
            :style="border('top')"
            keep
            :initial="workspace.panelsSize"
            @resize="workspace.setPanelsSize"
          >
            <split :initial="55" fixed>
              <panel-headers></panel-headers>
            </split>
            <split>
              <panels v-if="loaded"></panels>
              <blank v-else></blank>
            </split>
          </split>
        </split>
      </split>
      <split :initial="25" fixed>
        <status-bar :height="25"></status-bar>
      </split>
    </split>
    <notifications></notifications>
    <context-menu></context-menu>
    <palette 
      v-model="palette"
      palette-class="secondary"
      :items="paletteCommands"
    ></palette>
    <keyboard-shortcuts :items="paletteCommands"></keyboard-shortcuts>
    <palette 
      v-model="themePalette"
      palette-class="secondary"
      :items="themeCommands"
      automatic
      @cancel="restoreTheme"
    ></palette>
    <project-modal 
      v-model="backupModal" 
      :projects="general.projects"
      @open="openProject"
      @delete="deleteProject"
    ></project-modal>
    <loading 
      class="secondary"
      :value="!loaded"
    ></loading>
  </v-app>
</template>

<script lang="ts">
import fs from 'fs';
import fs2 from '@/fs';
import { Component, Vue } from 'vue-property-decorator';
import { shell, Event, DesktopCapturer, desktopCapturer } from 'electron';
import { cache, general, workspace, Project } from '@/store';
import { toTickTime, allKeys, Keys } from '@/utils';
import Transport from '@/modules/audio/transport';
import { automation } from '@/modules/knobs';
import Sidebar from '@/components/SideBar.vue';
import SideTabs from '@/sections/SideTabs.vue';
import Panels from '@/sections/Panels.vue';
import PanelHeaders from '@/sections/PanelHeaders.vue';
import ActivityBar from '@/sections/ActivityBar.vue';
import StatusBar from '@/sections/StatusBar.vue';
import Tone from 'tone';
import { SideTab, FILTERS, ApplicationContext, APPLICATION_PATH, RECORDING_PATH } from '@/constants';
import { PaletteItem } from '@/modules/palette';
import { Watch } from '@/modules/update';
import backend, { ProjectInfo } from '@/backend';
import * as io from '@/modules/cerialize';
import tmp from 'tmp';
import { remote } from 'electron';
import { Menu } from '@/modules/menubar';
import theme from '@/modules/theme';
import { Theme } from '@/modules/theme/types';
import auth from '@/auth';
import { User } from 'firebase';
import { ScheduledPattern } from '@/core/scheduled/pattern';
import { ScheduledSample, Sample } from '@/core';
import { Automatable } from '@/core/automation';
import * as Audio from '@/modules/audio';
import { Ghost, ChunkGhost } from '@/core/ghosts/ghost';
import audioBufferToWav from 'audiobuffer-to-wav';
import path from 'path';
import { win32 } from 'path';

@Component({
  components: {
    SideTabs,
    Panels,
    PanelHeaders,
    ActivityBar,
    StatusBar,
  },
})
export default class App extends Vue {

  get themeCommands(): PaletteItem[] {
    return Object.entries(theme.defaults).map(([name, theDefault]) => {
      return {
        text: name,
        callback: () => {
          workspace.setTheme(name);
          theme.insertTheme(theDefault);
        },
      };
    });
  }

  get getProjectsErrorMessage() {
    return general.getProjectsErrorMessage;
  }

  get transport() {
    if (workspace.applicationContext === 'pianoroll') {
      const pattern = workspace.selectedPattern;
      return pattern ? pattern.transport : null;
    } else {
      return general.project.master.transport;
    }
  }

  get playlistPlay() {
    return general.play && workspace.applicationContext === 'playlist';
  }
  public general = general;
  public workspace = workspace;
  public ghosts: Ghost[] = [];
  public mediaRecorder: MediaRecorder | null = null;

  public menuItems = {
    save: {
      text: 'Save',
      shortcut: ['Ctrl', 'S'],
      callback: this.save,
    },
    saveAs: {
      text: 'Save As',
      shortcut: ['Ctrl', 'Shift', 'S'],
      callback: () => this.save(true),
    },
    open: {
      text: 'Open',
      shortcut: ['Ctrl', 'O'],
      callback: this.open,
    },
    backup: {
      text: 'Open From Backup',
      callback: this.openBackup,
    },
    addFolder: {
      text: 'Add Folder to Workspace',
      callback: this.openFolder,
    },
    closeApplication: {
      text: 'Close Application',
      shortcut: ['Ctrl', 'W'],
      callback: this.closeApplication,
    },
    new: {
      shortcut: ['Ctrl', 'N'],
      text: 'New Project',
      callback: this.newProject,
    },
    reload: {
      text: 'Reload',
      shortcut: ['Ctrl', 'R'],
      callback: this.reload,
    },
    palette: {
      text: 'Command Palette',
      shortcut: ['Ctrl', 'Shift', 'P'],
      callback: this.openPalette,
    },
    switchContext: {
      text: 'Switch Context',
      shortcut: ['Ctrl', 'Tab'],
      callback: () => {
        if (workspace.applicationContext === 'pianoroll') {
          this.setContext('playlist');
        } else {
          this.setContext('pianoroll');
        }
      },
    },
  };

  public menu: Menu = [
    {
      name: 'File',
      items: [
        this.menuItems.new,
        null,
        this.menuItems.open,
        this.menuItems.backup,
        null,
        this.menuItems.addFolder,
        null,
        this.menuItems.save,
        this.menuItems.saveAs,
      ],
    },
    {
      name: 'View',
      items: [
        this.menuItems.palette,
        this.menuItems.reload,
      ],
    },
    {
      name: 'Help',
      items: [
        {
          text: 'Guide',
          callback: () => {
            shell.openExternal('https://dawg.github.io/guide');
          },
        },
        {
          text: 'Report an Issue',
          callback: () => {
            shell.openExternal('https://github.com/dawg/vusic/issues');
          },
        },
        {
          text: 'Trello Board',
          callback: () => {
            shell.openExternal('https://trello.com/b/ZOLQJGSv/vusic-feature-requests');
          },
        },
        null,
        {
          text: 'Open Developer Tools',
          callback: () => {
            const window = remote.getCurrentWindow();
            window.webContents.openDevTools();
          },
        },
      ],
    },
  ];

  public paletteCommands: PaletteItem[] = [
    {
      text: 'Open Piano Roll',
      shortcut: ['Ctrl', 'P'],
      callback: () => workspace.setOpenedPanel('Piano Roll'),
    },
    {
      text: 'Open File Explorer',
      shortcut: ['Ctrl', 'E'],
      callback: () => workspace.setOpenedSideTab('Explorer'),
    },
    {
      text: 'Open Mixer',
      shortcut: ['Ctrl', 'M'],
      callback: () => workspace.setOpenedPanel('Mixer'),
    },
    {
      text: 'Play/Pause',
      shortcut: ['Space'],
      callback: this.playPause,
    },
    {
      text: 'Change Theme',
      callback: this.openThemePalette,
    },
    ...Object.values(this.menuItems),
  ];

  // This loaded flag is important
  // Bugs can appear if we render before we load the project file
  // This occurs because some components mutate objects
  // However, they do not reapply their mutations
  // ie. some components expect props to stay the same.
  public loaded = false;

  public backupModal = false;
  public palette = false;
  public themePalette = false;
  public themeMomento: string | null = null;

  public maximized = false;

  // We need these to be able to keep track of the start and end of the playlist loop
  // for creating automation clips
  public masterStart = 0;
  public masterEnd = 0;

  public async created() {
    // This is called before refresh / close
    // I don't remove this listner because the window is closing anyway
    // I'm not even sure onExit would be called if we removed it in the destroy method
    window.addEventListener('beforeunload', this.onExit);

    const w = remote.getCurrentWindow();
    w.addListener('maximize', this.maximize);
    w.addListener('unmaximize', this.unmaximize);

    automation.$on('automate', this.addAutomationClip);

    auth.watchUser({
      authenticated: general.setUser,
      unauthenticated: () => {
        general.setUser(null);
      },
    });

    setTimeout(async () => {
      // Make sure we load the cache first before loading the default project.
      this.$log.debug('Starting to read data.');

      await cache.fromCacheFolder();

      const result = await general.loadProject();
      if (result.type === 'error') {
        this.$notify.info('Unable to load project.', { detail: result.message, duration: Infinity });
      }

      general.setProject(result.project);
      await workspace.loadSpecific();

      // Log this for debugging purposes
      // tslint:disable-next-line:no-console
      console.info(general.project);

      this.loadTheme(workspace.themeName);

      this.$log.debug('Finished reading data from the fs.');
      this.loaded = true;
    }, 1250);
  }

  public mounted() {
    this.checkMaximize();

    window.addEventListener('offline', this.offline);
    window.addEventListener('online', this.online);

    // The offline event is not fired if initially disconnected
    if (!navigator.onLine) {
      this.offline();
    }
  }

  public destroyed() {
    const w = remote.getCurrentWindow();
    w.removeListener('maximize', this.maximize);
    w.removeListener('unmaximize', this.unmaximize);

    window.removeEventListener('offline', this.offline);
    window.removeEventListener('online', this.online);
  }

  public online() {
    // Ok so this delay exists because we can still get connection errors even once we get back online
    // 8000 was just a random number, but it works. It's probably longer than necessary
    setTimeout(() => {
      general.project.instruments.forEach((instrument) => {
        this.$notify.info('Connection has been restored');
        instrument.online();
      });
    }, 8000);
  }

  public offline() {
    this.$notify.warning('You are disconnected', {
      detail: 'Soundfonts and cloud syncing will not work as expected.',
      duration: 20000,
    });
  }

  public openPalette() {
    this.palette = true;
  }

  public openFolder() {
    // TODO
    // the showFileDialog messes with the keyup events
    // This is a temporary solution
    cache.openFolder();
    this.$shortcuts.clear();
  }

  public openThemePalette() {
    this.themeMomento = workspace.themeName;
    this.themePalette = true;
  }

  public border(side: 'left' | 'right' | 'top' | 'bottom') {
    return `border-${side}: 1px solid ${this.$theme.background}`;
  }

  public loadTheme(themeName: string | null) {
    const isThemeKey = (key: string | null): key is keyof typeof theme.defaults => {
      return !!key && theme.defaults.hasOwnProperty(key);
    };

    if (isThemeKey(themeName)) {
      theme.insertTheme(theme.defaults[themeName]);
    }
  }

  public async onExit() {
    // If we don't have a file open, don't write the workspace information
    if (!general.projectPath) {
      return;
    }

    await workspace.write();
  }

  public openBackup() {
    this.handleUnauthenticated(async (user) => {
      this.backupModal = true;
      general.loadProjects(user);
    });
  }

  public restoreTheme() {
    this.loadTheme(this.themeMomento);
  }

  public async open() {
    // files can be undefined. There is an issue with the .d.ts files.
    const files = remote.dialog.showOpenDialog(
      remote.getCurrentWindow(),
      { filters: FILTERS, properties: ['openFile'] },
    );

    // TODO
    // the showFileDialog messes with the keyup events
    // This is a temporary solution
    this.$shortcuts.clear();

    if (!files) {
      return;
    }

    const filePath = files[0];
    await cache.setOpenedFile(filePath);
    const window = remote.getCurrentWindow();
    window.reload();
  }

  public async save(forceDialog: boolean = false) {
    // If we are backing up, star the progress circle!
    if (workspace.backup) {
      general.set({ key: 'syncing', value: true });
    }

    const backupStatus = await general.saveProject({
      backup: workspace.backup,
      user: general.user,
      forceDialog,
    });

    // Always set the value back to false... you never know
    general.set({ key: 'syncing', value: false });

    // backupStatus is true if workspace.backup is also true
    if (backupStatus) {
      switch (backupStatus.type) {
        case 'error':
          this.$notify.error('Unable to backup', { detail: backupStatus.message });
          general.set({ key: 'backupError', value: true });
          break;
        case 'success':
          // Make sure to set it back to false if there was an error previously
          general.set({ key: 'backupError', value: false });
          break;
      }
    }
  }

  public setContext(context: ApplicationContext) {
    workspace.setContext(context);
    general.pause();
  }

  public playPause() {
    if (!this.transport) {
      this.$notify.warning('Please select a Pattern.', {
        detail: 'Please create and select a Pattern first or switch the Playlist context.',
      });
      return;
    }

    // XXX move all of this
    if (this.mediaRecorder) {
      this.stopRecording();
    }

    if (this.transport.state === 'started') {
      this.$log.debug('PAUSING');
      this.transport.stop();
      general.pause();
    } else {
      this.$log.debug('PLAY');
      this.transport.start();
      general.start();
    }
  }

  /**
   * Whenever we add a sample, if it hasn't been imported before, add it the the list of project samples.
   */
  public checkPrototype(prototype: ScheduledPattern | ScheduledSample) {
    if (prototype.component !== 'sample-element') {
      return;
    }

    const sample = prototype.sample;
    if (general.project.samples.indexOf(prototype.sample) >= 0) {
      return;
    }

    this.$log.debug('Adding a sample!');
    general.project.addSample(sample);
  }

  public async addAutomationClip<T extends Automatable>(automatable: T, key: keyof T & string) {
    const added = await general.project.createAutomationClip({
      automatable,
      key,
      start: this.masterStart,
      end: this.masterEnd,
    });

    if (!added) {
      this.$notify.warning('Unable to create automation clip', {
        detail: 'There are no free tracks. Move elements and try again.',
      });
    }
  }

  public async openProject(info: ProjectInfo) {
    this.handleUnauthenticated(async (user) => {
      const res = await backend.getProject(user, info.id);
      if (res.type === 'not-found') {
        this.$notify.warning('Uh, we were unable to find project');
        return;
      }

      if (res.type === 'error') {
        this.$notify.error('Unable to get project', { detail: res.message });
        return;
      }


      const { name } = tmp.fileSync({ keep: true });
      fs.writeFileSync(name, JSON.stringify(res.project, null, 4));

      if (!fs.existsSync(name)) {
        throw Error(name);
      }

      this.$log.info(`Writing ${name} as backup`);
      cache.setBackupTempPath(name);

      const window = remote.getCurrentWindow();
      window.reload();
    });
  }

  public handleUnauthenticated(authenticated: (user: User) => void) {
    if (general.user === null) {
      // TODO dulication
      this.$notify.info('Please login first', { detail: 'Use the settings icon in the Activity Bar.' });
      return;
    }

    authenticated(general.user);
  }

  public deleteProject(info: ProjectInfo) {
    this.handleUnauthenticated(async (user) => {
      const res = await backend.deleteProject(user, info.id);

      if (res.type === 'success') {
        // We are not taking advantage of firebase here
        // Ideally firebase would send an event and we would update our project list
        // Until we do that, this will suffice
        general.setProjects(
          general.projects.filter((maybe) => maybe !== info),
        );
      } else if (res.type === 'not-found') {
        this.$notify.info(`Unable to delete ${info.name}`, { detail: 'The project was not found.' });
      } else {
        this.$notify.info(`Unable to delete ${info.name}`, { detail: res.message });
      }
    });
  }

  public async newProject() {
    await cache.setOpenedFile(null);
    this.reload();
  }

  public reload() {
      const window = remote.getCurrentWindow();
      window.reload();
  }

  public closeApplication() {
    const window = remote.getCurrentWindow();
    window.close();
  }

  public minimizeApplication() {
    const window = remote.getCurrentWindow();
    window.minimize();
  }

  public maximizeApplication() {
    const window = remote.getCurrentWindow();
    window.maximize();
  }

  public restoreApplication() {
    const window = remote.getCurrentWindow();
    window.restore();
  }

  public checkMaximize() {
    this.maximized = remote.getCurrentWindow().isMaximized();
  }

  public maximize() {
    this.maximized = true;
  }

  public unmaximize() {
    this.maximized = false;
  }

  @Watch<App>('getProjectsErrorMessage')
  public showNotification() {
    if (this.getProjectsErrorMessage) {
      this.$notify.error('Unable to get projects.', { detail: this.getProjectsErrorMessage });
    }
  }

  public record(trackId: number) {
    if ( this.mediaRecorder == null ) {
      this.startRecording(trackId);
    } else {
      this.stopRecording();
    }
  }

  public startRecording(trackId: number) {

    if (this.transport && this.transport.state === 'started') {
      this.$log.debug('PAUSING');
      this.transport.stop();
      general.pause();
    }

    workspace.setContext('playlist');

    const transport = general.project.master.transport;

    const time = transport.beats;

    if ( cache.microphoneIn === null ) {
      this.$notify.info('Please select a microphone from the settings.');
      return;
    }

    let deviceId: string | null = null;

    // enumerate devices and find our input device
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      devices.forEach((device) => {
        if ( device.label === cache.microphoneIn ) {
          deviceId = device.deviceId;
        }
      });

      if ( deviceId === null ) {
        this.$notify.info('Selected microphone is no longer available.');
        return;
      }

      // create new chunk ghost
      const ghost = new ChunkGhost(time, trackId);
      this.ghosts.push(ghost);

      const contraints: MediaStreamConstraints = {
        audio: {
          deviceId,
        },
        video: false,
      };

      navigator.mediaDevices.getUserMedia(contraints).then((stream) => {

        this.mediaRecorder = new MediaRecorder(stream);
        const audioBlobs: Blob[] = [];


        this.mediaRecorder.start(100);

        // keep the ghost updated
        this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if ( !general.isRecordingMicrophone ) {
            general.setRecordingMicrophone(true);
            transport.start();
            general.start();
          }
          audioBlobs.push(event.data);
          this.blobsToAudioBuffer(audioBlobs).then((buffer: AudioBuffer) => {
            ghost.buffer = buffer;
          });
        };

        this.mediaRecorder.onstop = () => {
          this.blobsToAudioBuffer(audioBlobs).then((buffer: AudioBuffer) => {

            const wavData: ArrayBuffer = audioBufferToWav(buffer, {
              sampleRate: buffer.sampleRate,
              float: true,
              bitDepth: 32,
            });

            fs2.mkdirRecursive(RECORDING_PATH);

            const date = new Date();
            const dst = path.join(RECORDING_PATH, 'recording-'
              + date.getFullYear() + '-'
              + date.getMonth() + '-'
              + date.getDay() + '-'
              + date.getHours() +
              + date.getMinutes() +
              + date.getSeconds() +
              '.wav');

            fs.writeFile(dst, new DataView(wavData), (err) => {
                if (err) {
                  this.$notify.error('' + err);
                }

                // add the file to the workspace
                // create a sample from the file.
                const master = general.project.master;
                const sample = Sample.create(dst, buffer);
                general.project.samples.push(sample);
                const scheduled = new ScheduledSample(sample, {
                  type: 'sample',
                  sampleId: sample.id,
                  duration: sample.beats,
                  row: trackId,
                  time,
                });

                scheduled.schedule(master.transport);
                master.elements.push(scheduled);

                general.setRecordingMicrophone(false);
              });
            });
        };
      }, (err) => {
        // this.$notify.error('' + err);
      });
    });
  }

  public stopRecording() {
    if (this.mediaRecorder != null) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
      this.ghosts = [];
    }
  }

  private blobsToAudioBuffer(blobs: Blob[]): Promise<AudioBuffer> {
    const reader = new FileReader();
    return new Promise<AudioBuffer>((resolve, reject) => {
      reader.onload = (event) => {
        const buffer = reader.result as ArrayBuffer;
        Audio.context.decodeAudioData(buffer).then((decodedBuffer) => {
          resolve(decodedBuffer);
        });
      };
      const audioBlob = new Blob(blobs);
      reader.readAsArrayBuffer(audioBlob);
    });
  }
}
</script>

<style lang="sass">
@import '~@/styles/global'
</style>

<style lang="sass" scoped>
.app
  display: flex
  flex-direction: column

.toolbar
  z-index: 10
</style>

