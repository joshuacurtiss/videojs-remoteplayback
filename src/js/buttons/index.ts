import type videojs from 'video.js';
import type { VideoJs } from '../../../@types/videojs';
import { checkClientSupportWithAirPlay } from '../lib/check-client-support';
import { createAirPlayButtonConstructor } from './AirPlayButton';
import { createBaseButtonConstructor, BaseButtonOptions } from './BaseButton';

export type RemotePlaybackButtonConstructor = VideoJs['Button'] & {
   new(player: videojs.Player, options?: Partial<BaseButtonOptions>): videojs.Button;
};

export function createButtonConstructor(videojs: VideoJs): RemotePlaybackButtonConstructor {
   return checkClientSupportWithAirPlay() ? createAirPlayButtonConstructor(videojs) : createBaseButtonConstructor(videojs);
}

export { createAirPlayButtonConstructor } from './AirPlayButton';
export { createBaseButtonConstructor } from './BaseButton';
