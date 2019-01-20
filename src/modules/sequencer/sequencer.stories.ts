import Vue from 'vue';
import { storiesOf } from '@storybook/vue';
import Dawg from '@/modules/dawg/Dawg.vue';
import PianoRollSequencer from '@/modules/sequencer/PianoRollSequencer.vue';
import PlaylistSequencer from '@/modules/sequencer/PlaylistSequencer.vue';
import Note from '@/modules/sequencer/Note.vue';
import Waveform from '@/modules/sequencer/Waveform.vue';
import SampleElement from '@/modules/sequencer/SampleElement.vue';
import PatternElement from '@/modules/sequencer/PatternElement.vue';
import BeatLines from '@/modules/sequencer/BeatLines';
import { loadFromUrl } from '@/modules/audio/web';
import { PlacedPattern, Pattern, Score, Note as NE, PlacedSample } from '@/schemas';

const Temp = Vue.extend({
  template: `<div style="height: 30px; width: 400px"></div>`,
  mixins: [BeatLines],
});

const notes = [
  {row: 44, time: 0, duration: 1},
  {row: 47, time: 0, duration: 1},
  {row: 49, time: 0, duration: 1},
  {row: 47, time: 1, duration: 1},
  {row: 49, time: 1, duration: 1},
  {row: 51, time: 1, duration: 1},
  {row: 52, time: 2, duration: 0.5},
  {row: 51, time: 3, duration: 0.5},
  {row: 45, time: 4, duration: 0.5},
  {row: 48, time: 5, duration: 0.5},
];

storiesOf(BeatLines.name, module)
  .add('Standard', () => ({
    template: `
    <dawg>
      <temp></temp>
    </dawg>
    `,
    components: { Temp, Dawg },
  }));

Vue.component('Note', Note);
Vue.component('PatternElement', PatternElement);
Vue.component('SampleElement', SampleElement);

const basicData = {
  measures: 1,
  sequencerLoopEnd: 0,
  loopStart: 0,
  loopEnd: 0,
  setLoopStart: 0,
  setLoopEnd: 0,
  progress: 0,
};

storiesOf('PianoRollSequencer', module)
  .add('default', () => ({
    template: `
    <dawg>
      <piano-roll-sequencer
        :elements="notes"
        :sequencer-loop-end.sync="sequencerLoopEnd"
        :loop-start="loopStart"
        :loop-end="loopEnd"
        :set-loop-start="setLoopStart"
        :set-loop-end="setLoopEnd"
        :progress="progress"
      ></piano-roll-sequencer>
    </dawg>
    `,
    data: () => ({
      ...basicData,
      notes: [],
    }),
    components: { PianoRollSequencer, Dawg },
  }));


const pattern = Pattern.create('Test Pattern');
const score = Score.create('kslfjlsdkfj');
pattern.scores = [score];
score.notes = notes.map((note) => new NE(note));
const patternElement = PlacedPattern.create(pattern);

storiesOf('PlaylistSequencer', module)
.add('default', () => ({
  template: `
  <dawg>
    <playlist-sequencer
      :elements="elements"
      :create-class="placedSample"
      :sequencer-loop-end.sync="sequencerLoopEnd"
      :loop-start="loopStart"
      :loop-end="loopEnd"
      :set-loop-start="setLoopStart"
      :set-loop-end="setLoopEnd"
      :progress="progress"
    ></playlist-sequencer>
  </dawg>
  `,
  data: () => ({
    ...basicData,
    elements: [],
    buffer: null,
  }),
  components: { PlaylistSequencer, Dawg },
  computed: {
    placedSample() {
      if (!this.buffer) {
        return null;
      }

      // @ts-ignore
      return PlacedSample.create(this.buffer);
    },
  },
  mounted,
}));

function mounted() {
  loadFromUrl('thing.wav')
    .then((buffer) => {
      // @ts-ignore
      this.buffer = buffer;
    });
}

storiesOf('Waveform', module)
  .add('default', () => ({
    template: `<waveform :buffer="buffer" style="width: 200px"></waveform>`,
    components: { Waveform },
    data: () => ({ buffer: null }),
    mounted,
  }));

storiesOf('SampleElement', module)
  .add('default', () => ({
    template: `
    <dawg>
      <sample-element
        :buffer="buffer"
        :duration.sync="duration"
      ></sample-element>
    </dawg>
    `,
    components: { SampleElement, Dawg },
    data: () => ({ buffer: null, duration: 1 }),
    mounted,
  }));




storiesOf('PatternElement', module)
  .add('default', () => ({
    template: `
    <dawg>
      <pattern-element
        :duration.sync="duration"
        :notes="notes"
      ></pattern-element>
    </dawg>`,
    components: { PatternElement, Dawg },
    data: () => ({ notes, duration: 2 }),
  }));
