import type { VideoJsPlayer } from '../../../@types/videojs';

export interface HTMLMediaElementWithAirPlay extends HTMLMediaElement {
   webkitCurrentPlaybackTargetIsWireless: boolean;
   webkitShowPlaybackTargetPicker(): void;
}

/**
 * Type guard to check if a given element is an HTMLMediaElement that supports
 * RemotePlayback API.
 */
export function isMediaElement(el: unknown): el is HTMLMediaElement {
   return !!el &&
      el instanceof HTMLMediaElement &&
      'remote' in el;
}

/**
 * Retrieves the media element from a Video.js player, if it supports RemotePlayback API.
 */
export function getMediaElement(player: VideoJsPlayer): HTMLMediaElement | null {
   const mediaEl = player.tech(true)?.el();

   if (isMediaElement(mediaEl)) {
      return mediaEl;
   }

   return null;
}

/**
 * Type guard to check if a given element is an HTMLMediaElement that supports AirPlay.
 */
export function isMediaElementWithAirPlay(el: unknown): el is HTMLMediaElementWithAirPlay {
   return !!el &&
      el instanceof HTMLMediaElement &&
      'webkitShowPlaybackTargetPicker' in el &&
      'webkitCurrentPlaybackTargetIsWireless' in el;
}

/**
 * Retrieves the media element from a Video.js player, if it supports AirPlay.
 */
export function getMediaElementWithAirPlay(player: VideoJsPlayer): HTMLMediaElementWithAirPlay | null {
   const mediaEl = player.tech(true)?.el();

   if (isMediaElementWithAirPlay(mediaEl)) {
      return mediaEl;
   }

   return null;
}
