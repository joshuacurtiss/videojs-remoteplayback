import type { VideoJs } from '../../@types/videojs';
import { COMPONENT_NAMES, RemotePlaybackPlugin } from './RemotePlaybackPlugin';
import '../styles/index.scss';
import { AirPlayButton } from './buttons/AirPlayButton';
import { BaseButton } from './buttons/BaseButton';
import { checkClientSupportWithAirPlay } from './lib/check-client-support';

// Receives a video.js instance and registers the plugin
export default function initializePlugin(videojs: VideoJs): void {
   videojs.registerComponent(COMPONENT_NAMES.REMOTE_PLAYBACK_BUTTON, checkClientSupportWithAirPlay() ? AirPlayButton : BaseButton);
   videojs.registerPlugin('remotePlayback', RemotePlaybackPlugin);
   videojs.log(`Remote Playback plugin registered with video.js version ${videojs.VERSION}.`);
}

export * from './RemotePlaybackPlugin';
export * from './strategies/AirPlayManager';
export * from './strategies/RemotePlaybackManager';
