<template>
  <button class="button" @click="click"> Transcribe </button>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { workspace } from '@/store';
import { runModel } from '@/models';
import path from 'path';

@Component
export default class Transcription extends Vue {
  @Prop({type: String}) public samplePath!: string;

  public click() {
    const provider = this.$busy(`Converting ${path.basename(this.samplePath)} to MIDI`);

    runModel({
      pythonPath: workspace.pythonPath,
      modelsPath: workspace.modelsPath,
      scriptPath: 'vusic/transcription/scripts/infer.py',
      samplePath: this.samplePath,
      cb: (result) => {
        provider.dispose();
        if (result.type === 'error') {
          this.$notify.error(result.message, {
            detail: result.details,
            duration: Infinity,
          });
        }

        if (result.type === 'success') {
          this.$notify.success(result.message, {detail: result.details});
        }
      },
    });
  }
}

</script>

<style scoped lang="sass">
  .button
    border: solid 1px
    padding: 5px
    border-radius: 5px
    user-select: none
</style>
