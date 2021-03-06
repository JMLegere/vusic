import Vue, { VueConstructor } from 'vue';
import Sequencer from '@/modules/sequencer/Sequencer.vue';
import PE from '@/modules/sequencer/PatternElement.vue';
import SE from '@/modules/sequencer/SampleElement.vue';
import PlaylistSequencer from '@/modules/sequencer/PlaylistSequencer.vue';
import PianoRollSequencer from '@/modules/sequencer/PianoRollSequencer.vue';
import ACE from '@/modules/sequencer/AutomationClipElement.vue';
import N from '@/modules/sequencer/Note.vue';
import Waveform from '@/modules/dawg/Waveform.vue';
import Scroller from '@/modules/sequencer/Scroller.vue';
import { positionable, resizable, selectable, colored } from '@/modules/sequencer/helpers';

function hoc(o: VueConstructor) {
  return positionable(resizable(selectable(o)));
}

export const SampleElement = hoc(colored(SE));
export const PatternElement = hoc(colored(PE));
export const AutomationClipElement = hoc(colored(ACE));
export const Note = hoc(N);

export {
  Sequencer,
  positionable,
  resizable,
  selectable,
  colored,
};


export default {
  install() {
    Vue.component('Note', Note);
    Vue.component('PatternElement', PatternElement);
    Vue.component('SampleElement', SampleElement);
    Vue.component('PlaylistSequencer', PlaylistSequencer);
    Vue.component('PianoRollSequencer', PianoRollSequencer);
    Vue.component('AutomationClipElement', AutomationClipElement);
    Vue.component('Scroller', Scroller);
    Vue.component('Waveform', Waveform);
  },
};
