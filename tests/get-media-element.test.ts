import { describe, expect, it, vi } from 'vitest';
import type { VideoJsPlayer } from '../@types/videojs';
import { getMediaElement, getMediaElementWithAirPlay } from '../src/js/lib/get-media-element';

function createPlayer(mediaElement: unknown, techLoaded = true): {
   player: VideoJsPlayer;
   tech: ReturnType<typeof vi.fn>;
   getElement: ReturnType<typeof vi.fn>;
} {
   const getElement = vi.fn().mockReturnValue(mediaElement),
         tech = vi.fn().mockReturnValue(techLoaded ? { el: getElement } : undefined),
         player = { tech } as unknown as VideoJsPlayer;

   return { player, tech, getElement };
}

function addRemotePlayback(element: HTMLMediaElement): void {
   Object.defineProperty(element, 'remote', { value: {}, configurable: true });
}

function addAirPlay(element: HTMLMediaElement): void {
   Object.defineProperty(element, 'webkitShowPlaybackTargetPicker', {
      value: () => { return undefined; },
      configurable: true,
   });
   Object.defineProperty(element, 'webkitCurrentPlaybackTargetIsWireless', {
      value: false,
      configurable: true,
   });
}

describe('getMediaElement', () => {
   it.each([ 'video', 'audio' ] as const)('retrieves a %s tech element with Remote Playback support', (tag) => {
      const mediaElement = document.createElement(tag);

      addRemotePlayback(mediaElement);
      const { player, tech, getElement } = createPlayer(mediaElement);

      expect(getMediaElement(player)).toBe(mediaElement);
      expect(tech).toHaveBeenCalledWith(true);
      expect(getElement).toHaveBeenCalledOnce();
   });

   it('returns null when no tech is loaded', () => {
      const { player, tech, getElement } = createPlayer(undefined, false);

      expect(getMediaElement(player)).toBeNull();
      expect(tech).toHaveBeenCalledWith(true);
      expect(getElement).not.toHaveBeenCalled();
   });

   it('returns null for a non-media element with Remote Playback support', () => {
      const element = document.createElement('div');

      Object.defineProperty(element, 'remote', { value: {}, configurable: true });
      const { player } = createPlayer(element);

      expect(getMediaElement(player)).toBeNull();
   });

   it('returns null when the tech element lacks Remote Playback support', () => {
      const { player, tech, getElement } = createPlayer(document.createElement('video'));

      expect(getMediaElement(player)).toBeNull();
      expect(tech).toHaveBeenCalledWith(true);
      expect(getElement).toHaveBeenCalledOnce();
   });
});

describe('getMediaElementWithAirPlay', () => {
   it.each([ 'video', 'audio' ] as const)('retrieves a %s tech element with AirPlay support', (tag) => {
      const mediaElement = document.createElement(tag);

      addAirPlay(mediaElement);
      const { player, tech, getElement } = createPlayer(mediaElement);

      expect(getMediaElementWithAirPlay(player)).toBe(mediaElement);
      expect(tech).toHaveBeenCalledWith(true);
      expect(getElement).toHaveBeenCalledOnce();
   });

   it('returns null when no tech is loaded', () => {
      const { player, tech, getElement } = createPlayer(undefined, false);

      expect(getMediaElementWithAirPlay(player)).toBeNull();
      expect(tech).toHaveBeenCalledWith(true);
      expect(getElement).not.toHaveBeenCalled();
   });

   it('returns null for a non-media element with AirPlay support', () => {
      const element = document.createElement('div');

      Object.defineProperty(element, 'webkitShowPlaybackTargetPicker', { value: () => { return undefined; } });
      Object.defineProperty(element, 'webkitCurrentPlaybackTargetIsWireless', { value: false });
      const { player } = createPlayer(element);

      expect(getMediaElementWithAirPlay(player)).toBeNull();
   });

   it('returns null when only the AirPlay picker is available', () => {
      const mediaElement = document.createElement('video');

      Object.defineProperty(mediaElement, 'webkitShowPlaybackTargetPicker', { value: () => { return undefined; } });
      const { player } = createPlayer(mediaElement);

      expect(getMediaElementWithAirPlay(player)).toBeNull();
   });

   it('returns null when the tech element lacks AirPlay support', () => {
      const { player, tech, getElement } = createPlayer(document.createElement('video'));

      expect(getMediaElementWithAirPlay(player)).toBeNull();
      expect(tech).toHaveBeenCalledWith(true);
      expect(getElement).toHaveBeenCalledOnce();
   });
});
