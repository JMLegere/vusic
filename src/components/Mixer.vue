<template>
  <div class="mixer secondary-lighten-4" style="height: 100%">
    <vue-perfect-scrollbar style="height: 100%; width: 100%">
      <channel
        v-for="(channel, i) in channels"
        :key="i"
        :play="play"
        :channel="channel"
        @add="addEffect(channel, $event)"
        @delete="deleteEffect(channel, $event)"
        @select="openEffect"
      ></channel>
    </vue-perfect-scrollbar>
    <effect 
      v-if="openedEffect"
      :effect="openedEffect"
    ></effect>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Channel from '@/components/Channel.vue';
import { Watch } from '@/modules/update';
import { range } from '@/utils';
import { AnyEffect, Channel as C } from '@/core';

@Component({
  components: { Channel },
})
export default class Mixer extends Vue {
  @Prop({ type: Array, required: true  }) public channels!: C[];
  @Prop({ type: Boolean, required: true }) public play!: boolean;
  public openedEffect: null | AnyEffect = null;

  public addEffect(channel: Channel, { effect, index }: { effect: AnyEffect, index: number }) {
    this.$emit('add', { channel, effect, index });
  }

  public openEffect(effect: AnyEffect) {
    if (effect === this.openedEffect) {
      this.openedEffect = null;
    } else {
      this.openedEffect = effect;
    }
  }

  public deleteEffect(channel: Channel, effect: AnyEffect) {
    this.$emit('delete', { channel, effect });
  }
}
</script>

<style scoped lang="sass">
.mixer
  white-space: nowrap
  height: 400px
  display: flex
</style>
