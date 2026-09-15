import type { VideoJs } from '../../@types/videojs';
import { COMPONENT_NAMES, createRemotePlaybackPluginConstructor } from './RemotePlaybackPlugin';
import type { RemotePlaybackPluginConstructor } from './RemotePlaybackPlugin';
import '../styles/index.scss';
import { createButtonConstructor } from './buttons';

const registeredInstances = new WeakMap<VideoJs, RemotePlaybackPluginConstructor>();

/**
 * Registers the plugin against a supplied Video.js instance. All classes are created here
 * so they inherit from that instance, including when it is a compatible fork.
 */
export default function initializePlugin(videojs: VideoJs): RemotePlaybackPluginConstructor {
   const RegisteredPlugin = registeredInstances.get(videojs);

   if (RegisteredPlugin) {
      return RegisteredPlugin;
   }

   const RemotePlaybackPlugin = createRemotePlaybackPluginConstructor(videojs);

   videojs.registerComponent(COMPONENT_NAMES.REMOTE_PLAYBACK_BUTTON, createButtonConstructor(videojs));
   videojs.registerPlugin('remotePlayback', RemotePlaybackPlugin);
   registeredInstances.set(videojs, RemotePlaybackPlugin);
   videojs.log(`Remote Playback plugin registered with video.js version ${videojs.VERSION}.`);
   return RemotePlaybackPlugin;
}

export * from './RemotePlaybackPlugin';
export * from './buttons';
export * from './strategies/AirPlayManager';
export * from './strategies/RemotePlaybackManager';
