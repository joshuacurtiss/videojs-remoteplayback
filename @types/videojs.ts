import videojs from 'video.js';
import type { RemotePlaybackPlugin, RemotePlaybackPluginOptions } from '../src/js/RemotePlaybackPlugin';

export type VideoJs = typeof videojs;

export interface VideoJsPlayer extends videojs.Player {
   remotePlayback(options?: Partial<RemotePlaybackPluginOptions>): RemotePlaybackPlugin;
}
