import * as t from 'io-ts';
import * as Audio from '@/modules/audio';
import { ScheduledPattern, ScheduledPatternType } from './scheduled/pattern';
import { ScheduledSample, ScheduledSampleType } from './scheduled/sample';
import { ScheduledAutomation, ScheduledAutomationType } from './scheduled/automation';
import { Serializable } from './serializable';

export const PlaylistType = t.partial({
  elements: t.array(t.union([
    ScheduledPatternType,
    ScheduledSampleType,
    ScheduledAutomationType,
  ])),
});

export type IPlaylist = t.TypeOf<typeof PlaylistType>;

/**
 * The possible elements that can be scheduled on a playlist.
 */
type PlaylistElements = ScheduledPattern | ScheduledSample | ScheduledAutomation;

export class Playlist implements Serializable<IPlaylist> {
  /**
   * The elements currently scheduled on the transport.
   */
  public elements: PlaylistElements[];

  /**
   * The master transport.
   */
  public transport = new Audio.Transport();

  constructor(elements: PlaylistElements[]) {
    this.elements = elements;
    this.elements.forEach((element) => {
      element.schedule(this.transport);
    });
  }

  public serialize() {
    return {
      elements: this.elements.map((element) => element.serialize()),
    };
  }
}
