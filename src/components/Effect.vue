<template>
  <div class="effect secondary">
    <div class="title foreground--text">{{ name | upper }}</div>
    <div style="display: flex; flex-direction: column">
      <knob
        class="option"
        v-for="key in keys"
        :name="key"
        :key="key"
        :label="key | titleCase"
        stroke-class="secondary-lighten-2--stroke"
        :value="options[key]"
        @input="effect.set({ key, value: $event })"
        :min="constraints(key).min"
        :max="constraints(key).max"
        :size="size"
        disable-automation
      ></knob>
      <knob
        class="option"
        name="Wet"
        label="Wet"
        stroke-class="secondary-lighten-2--stroke"
        v-model="effect.wet.value"
        :min="0"
        :max="1"
        :size="size"
        disable-automation      
      ></knob>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { EffectName } from '@/core/filters/effects';
import { EffectConstrainsType, EffectConstrains } from '@/core/filters/bounds';
import { Effect as E } from '@/core/filters/effect';

@Component({
  filters: {
    titleCase(text: string) {
      const result = text.replace( /([A-Z])/g, ' $1' );
      return result.charAt(0).toUpperCase() + result.slice(1);
    },
    upper(text: string) {
      return text.toUpperCase();
    },
  },
})
export default class Effect<T extends EffectName> extends Vue {
  @Prop({ type: Object, required: true }) public effect!: E<T>;
  public size = 30;

  get name() {
    return this.effect.type;
  }

  get options() {
    return this.effect.options;
  }

  get keys() {
    return Object.keys(this.options);
  }

  public constraints(name: keyof EffectConstrainsType[T]) {
    return EffectConstrains[this.effect.type][name];
  }
}
</script>

<style lang="sass" scoped>
.title
  font-size: 30px
  margin: 0 0 15px

.effect
  margin: 5px
  padding: 9px 5px
  border-radius: 5px
  text-align: center

.option
  margin: 5px
</style>