import type { VideoJsPlayer } from '../../../@types/videojs';
import EVENTS from '../constants/events';
import type { RemotePlaybackPlugin, RemotePlaybackStrategy } from '../RemotePlaybackPlugin';
import { getMediaElementWithAirPlay, HTMLMediaElementWithAirPlay } from '../lib/get-media-element';
import { checkClientSupportWithAirPlay } from '../lib/check-client-support';

interface RemotePlaybackAvailabilityEvent extends Event {
   availability: 'available' | 'not-available';
}

function isRemotePlaybackAvailabilityEvent(o: unknown): o is RemotePlaybackAvailabilityEvent {
   return typeof o === 'object' && o !== null && 'availability' in o;
}

/**
 * Orchestrates AirPlay behavior for a single Video.js player.
 */
export class AirPlayManager implements RemotePlaybackStrategy {
   public readonly kind = 'AirPlay';
   private readonly _listeners = {
      'webkitplaybacktargetavailabilitychanged': (event: Event) => {
         if (!isRemotePlaybackAvailabilityEvent(event)) {
            this.plugin?.log.error('Received unexpected event type:', event);
            return;
         }

         this.plugin?.log('AirPlay availability changed:', event.availability);
         if (event.availability === 'available') {
            this._player.trigger(EVENTS.AVAILABLE);
         } else {
            this._player.trigger(EVENTS.UNAVAILABLE);
         }
      },
      'webkitcurrentplaybacktargetiswirelesschanged': () => {
         this.plugin?.log('AirPlay playback target changed. Is wireless:', this._mediaElement?.webkitCurrentPlaybackTargetIsWireless);
         if (this._mediaElement?.webkitCurrentPlaybackTargetIsWireless) {
            this._player.trigger(EVENTS.CONNECTED);
         } else {
            this._player.trigger(EVENTS.DISCONNECTED);
         }
      },
   };
   private readonly _player: VideoJsPlayer;
   private _mediaElement: HTMLMediaElementWithAirPlay | null = null;

   public constructor(player: VideoJsPlayer) {
      this._player = player;

      // Only proceed if the browser supports native AirPlay
      if (!checkClientSupportWithAirPlay()) {
         this.plugin?.log.error('Native AirPlay not supported!');
         return;
      }

      // Get the media element
      const mediaElement = getMediaElementWithAirPlay(this._player);

      if (!mediaElement) {
         this.plugin?.log.error('Media element with AirPlay support not found.');
         return;
      }

      // Only after all checks do we hold a reference to element and set up listeners
      this._mediaElement = mediaElement;
      this._setupEventListeners();
      this.plugin?.log('Native AirPlay strategy initialization successful.');
   }

   public get player(): VideoJsPlayer {
      return this._player;
   }

   /**
    * Open the AirPlay device picker for the current media element.
    */
   public async prompt(): Promise<void> {
      if (!this._mediaElement) {
         this.plugin?.log.error('No media element with AirPlay support was captured during initialization!');
         return;
      }
      try {
         this._mediaElement.webkitShowPlaybackTargetPicker();
         this.plugin?.log('Native AirPlay device picker opened.');
      } catch(error) {
         this.plugin?.log.error('Failed to open AirPlay device picker!', error);
      }
   }

   /**
    * Clean up resources and event listeners.
    */
   public dispose(): void {
      Object.entries(this._listeners).forEach(([ event, listener ]) => {
         this._mediaElement?.removeEventListener(event, listener);
      });
      this._mediaElement = null;
   }

   private get plugin(): RemotePlaybackPlugin | undefined {
      return this._player.usingPlugin('remotePlayback') ? this._player.remotePlayback() : undefined;
   }

   /**
    * Wire up connection state events for the WebKit AirPlay implementation. These events
    * are re-emitted on the Video.js player so UI components (e.g. the AirPlay button) can
    * respond to events.
    */
   private _setupEventListeners(): void {
      if (!this._mediaElement) {
         return;
      }

      Object.entries(this._listeners).forEach(([ event, listener ]) => {
         this._mediaElement?.addEventListener(event, listener);
      });
   }

}
