import Vue from 'vue';
import Vuetify from 'vuetify';
import 'vue-awesome/icons';
import 'vuetify/dist/vuetify.css';
import '@/styles/material.css';
import Icon from 'vue-awesome/components/Icon.vue';
import VueLogger from 'vuejs-logger';
import Update from '@/modules/update';
import Theme from '@/modules/theme';
import sequencer from '@/modules/sequencer';
import Dawg from '@/modules/dawg';
import DragNDrop from '@/modules/dragndrop';
import '@/styles/global.sass';
import VuePerfectScrollbar from 'vue-perfect-scrollbar';
import { DragElement } from '@/modules/draggable';
import Knobs from '@/modules/knobs';
import Split from '@/modules/split';
import Status from '@/modules/status';

import Piano from '@/components/Piano.vue';
import DTrack from '@/components/DTrack.vue';
import TooltipIcon from '@/components/TooltipIcon.vue';
import DotButton from '@/components/DotButton.vue';
import Palette from '@/modules/palette';
import MenuBar from '@/modules/menubar';
import Explorer from '@/modules/explorer';
import BusySignal from '@/modules/BusySignal';

export default function middleware() {
  Vue.use(Split);
  Vue.use(Theme);
  Vue.use(Update);
  Vue.use(DragNDrop);
  Vue.use(Dawg);
  Vue.use(Palette);
  Vue.use(Knobs);
  Vue.use(BusySignal);
  Vue.use(MenuBar);
  Vue.use(Status);
  Vue.use(Explorer);
  Vue.use(VueLogger, {
    logLevel: 'info',
  });
  Vue.use(sequencer);
  Vue.component('VuePerfectScrollbar', VuePerfectScrollbar);

  Vue.use(Vuetify, {theme: false});
  Vue.component('icon', Icon);

  // TODO Move these to the dawg module
  Vue.component('Piano', Piano);
  Vue.component('DTrack', DTrack);
  Vue.component('DotButton', DotButton);
  Vue.component('TooltipIcon', TooltipIcon);

  Vue.component('DragElement', DragElement);
}
