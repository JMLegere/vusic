<template>
  <sequencer
    v-on="$listeners"
    v-bind="$attrs"
    :num-rows="tracks.length"
    :row-height="rowHeight"
    :row-class="() => 'secondary'"
    :row-style="rowStyle"
    :side-width="130"
    :transport="transport"
    name="Playlist"
    :prototype.sync="prototype"
  >
    <template slot="side">
      <d-track
        :style="{ height: `${rowHeight}px` }"
        v-for="(track, i) in tracks" 
        :key="i" 
        :track="track"
        @contextmenu.native="trackOptions($event, i)"
      ></d-track>
    </template>
  </sequencer>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject } from 'vue-property-decorator';
import Sequencer from '@/modules/sequencer/Sequencer.vue';
import { Track } from '@/core';
import { toTickTime } from '@/utils';
import Transport from '@/modules/audio/transport';

@Component({
  components: { Sequencer },
})
export default class PlaylistSequencer extends Vue {
  @Prop({ type: Number, required: true }) public rowHeight!: number;
  @Prop({ type: Array, required: true }) public tracks!: Track[];
  @Prop({ type: Object, required: true }) public transport!: Transport;

  public prototype = null;

  public trackOptions(event: MouseEvent, i: number) {
    this.$context({
      event,
      items: [
        {
          text: 'Record',
          callback: () => this.$emit('record', i),
        },
      ],
    });
  }


  public rowStyle() {
    return {
      borderBottom: `1px solid ${this.$theme.background}`,
    };
  }
}
</script>

<style lang="sass" scoped>

</style>