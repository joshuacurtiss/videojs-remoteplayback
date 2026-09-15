import type videojs from 'video.js';
import type { VideoJs } from '../../../@types/videojs';
import type { RemotePlaybackButtonConstructor } from './index';
import { createBaseButtonConstructor, BaseButtonOptions } from './BaseButton';

// DEFAULTS

export const defaultAirPlayButtonOptions: BaseButtonOptions = {
   addLabelToButton: true,
   label: 'AirPlay',
};

/**
 * Factory function that creates a button constructor for an AirPlay button.
 */
export const createAirPlayButtonConstructor = (videojs: VideoJs): RemotePlaybackButtonConstructor => {
   const BaseButton = createBaseButtonConstructor(videojs);

   return class extends BaseButton {

      public constructor(player: videojs.Player, options: Partial<BaseButtonOptions> = {}) {
         super(player, Object.assign({}, defaultAirPlayButtonOptions, options));
      }

      public buildCSSClass(): string {
         return `airplay ${super.buildCSSClass()}`;
      }

   };
};
