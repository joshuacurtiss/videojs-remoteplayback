import type videojs from 'video.js';
import type { BaseButtonOptions } from './buttons/BaseButton';
import type { VideoJs, VideoJsPlayer } from '../../@types/videojs';
import EVENTS from './constants/events';
import { AirPlayManager } from './strategies/AirPlayManager';
import { RemotePlaybackManager } from './strategies/RemotePlaybackManager';
import { checkClientSupportWithAirPlay, checkClientSupport } from './lib/check-client-support';

// INTERFACES

export interface RemotePlaybackStrategy {
   kind: 'AirPlay' | 'RemotePlaybackAPI';
   dispose(): void;
   prompt(): Promise<void>;
   get player(): VideoJsPlayer;
}

export interface RemotePlaybackPluginOptions extends Partial<BaseButtonOptions> {
   addButtonToControlBar: boolean;
   preferNativeAirPlay: boolean;
}

// This interface is used by the strategy classes as a type-only interface to avoid
// neeeding to instantiate the class with the factory function.
export interface RemotePlaybackPlugin extends videojs.Plugin {
   readonly log: videojs.Log;
   get strategy(): RemotePlaybackStrategy | undefined;
}

export type RemotePlaybackPluginConstructor = VideoJs['Plugin'] & {
   new(player: videojs.Player, options?: Partial<RemotePlaybackPluginOptions>): RemotePlaybackPlugin;
};

// TYPE GUARDS

export function isPlayerWithRemotePlaybackPlugin(o: unknown): o is VideoJsPlayer {
   return typeof o === 'object' && o !== null &&
      // Check for presence of some standard Player methods
      'ready' in o && typeof o.ready === 'function' &&
      'currentTime' in o && typeof o.currentTime === 'function' &&
      'play' in o && typeof o.play === 'function' &&
      'pause' in o && typeof o.pause === 'function' &&
      // Finally, check for presence of our plugin
      'remotePlayback' in o && typeof o.remotePlayback === 'function';
}

// DEFAULTS / CONSTANTS

const defaultOptions: RemotePlaybackPluginOptions = {
   addButtonToControlBar: true,
   preferNativeAirPlay: false,
};

export const COMPONENT_NAMES = {
   REMOTE_PLAYBACK_BUTTON: 'remotePlaybackButton',
   CONTROL_BAR: 'controlBar',
   FULLSCREEN_TOGGLE: 'fullscreenToggle',
} as const;

/**
 * Factory function that creates the plugin class from the exact Video.js instance that
 * will register it. You must get the class from this function to avoid issues with
 * multiple Video.js instances in the same runtime.
 */
export function createRemotePlaybackPluginConstructor(videojs: VideoJs): RemotePlaybackPluginConstructor {
   const Plugin = videojs.getPlugin('plugin');

   return class RemotePlaybackPlugin extends Plugin {
      public readonly log!: videojs.Log;
      private readonly _options: RemotePlaybackPluginOptions;
      private _strategy: RemotePlaybackStrategy | undefined;
      private readonly _listeners = {
         [EVENTS.PROMPT_REQUESTED]: () => {
            if (!this._strategy) {
               this.log.error('No remote playback strategy available to handle prompt intent!');
               return;
            }

            this._strategy.prompt().catch((error: Error) => {
               this.log.error(error);
            });
         },
      };

      public constructor(player: videojs.Player, options: Partial<RemotePlaybackPluginOptions> = {}) {
         super(player, options);
         this._options = Object.assign({}, defaultOptions, options);
         Object.entries(this._listeners).forEach(([ event, listener ]) => {
            this.player.on(event, listener);
         });
         this.player.ready(() => {
            if (!isPlayerWithRemotePlaybackPlugin(this.player)) {
               this.log.error('Player is missing the plugin!');
               return;
            }
            if (this._options.preferNativeAirPlay && checkClientSupportWithAirPlay()) {
               this.log('Initializing with native AirPlay strategy.');
               this._strategy = new AirPlayManager(this.player);
            } else if (checkClientSupport()) {
               this.log('Initializing with Remote Playback API strategy.');
               this._strategy = new RemotePlaybackManager(this.player);
            } else {
               this.log.error('No supported strategies available!');
               return;
            }
            if (this._options.addButtonToControlBar) {
               this._addButtonToControlBar();
            }
         });
      }

      public dispose(): void {
         this.log(`Disposing of ${this.strategy?.kind} strategy.`);
         Object.entries(this._listeners).forEach(([ event, listener ]) => {
            this.player.off(event, listener);
         });
         this.strategy?.dispose();
         super.dispose();
      }

      public get strategy(): RemotePlaybackStrategy | undefined {
         return this._strategy;
      }

      private _addButtonToControlBar(): void {
         const controlBar = this.player.getChild(COMPONENT_NAMES.CONTROL_BAR);

         if (!controlBar) {
            this.log.error(`Control bar component not found. Cannot add ${this.strategy?.kind} manager button.`);
            return;
         }

         try {
            const fullscreenToggle = controlBar.getChild(COMPONENT_NAMES.FULLSCREEN_TOGGLE),
                  children = controlBar.children(),
                  fullscreenToggleIndex = fullscreenToggle ? children.indexOf(fullscreenToggle) : -1,
                  insertIndex = fullscreenToggleIndex >= 0 ? fullscreenToggleIndex : children.length;

            controlBar.addChild(COMPONENT_NAMES.REMOTE_PLAYBACK_BUTTON, this._options, insertIndex);
            this.log(`Added ${this.strategy?.kind} ${COMPONENT_NAMES.REMOTE_PLAYBACK_BUTTON} to control bar at index ${insertIndex}.`);
         } catch(error) {
            this.log.error(`Failed to add ${this.strategy?.kind} ${COMPONENT_NAMES.REMOTE_PLAYBACK_BUTTON} to control bar,`, error);
         }
      }
   };
}
