<template>
  <div 
    class="editable"
    :contenteditable="contenteditable"
    @blur="blur"
    @dblclick="dblclick" 
    @input="input"
    @keydown="keydown"
  ></div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { Keys } from '@/utils';

@Component
export default class NAME extends Vue {
  @Prop({ type: String, required: true }) public value!: string;
  public contenteditable = false;
  public $el!: HTMLElement;

  public mounted() {
    this.$el.innerText = this.value;
  }

  public dblclick() {
    this.contenteditable = true;
    this.$nextTick(() => {
      this.$el.focus();
      // Select all of the text in the div!
      document.execCommand('selectall', undefined, undefined);
    });
  }

  public blur() {
    this.contenteditable = false;
  }

  public input(e: any) {
    this.$emit('input', e.currentTarget.innerText);
  }

  public keydown(e: KeyboardEvent) {
    if (e.keyCode !== Keys.ENTER) { return; }
    this.$el.blur();
  }
}
</script>

<style lang="sass" scoped>
.editable
  user-select: none
  cursor: default
</style>