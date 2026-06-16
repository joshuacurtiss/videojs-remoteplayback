import { beforeEach, describe, expect, it, vi } from 'vitest';
import './mocks/video-js-mock';
import videojs from '@silvermine/video.js';
import initializePlugin from '../src/js';
import { RemotePlaybackPlugin } from '../src/js/RemotePlaybackPlugin';
import EVENTS from '../src/js/constants/events';
import { BaseButton } from '../src/js/buttons/BaseButton';
import { checkClientSupport, checkClientSupportWithAirPlay } from '../src/js/lib/check-client-support';
import { VideoJsPlayer } from '../@types/videojs';

vi.mock('../src/js/lib/check-client-support', () => {
   return {
      checkClientSupport: vi.fn(),
      checkClientSupportWithAirPlay: vi.fn(),
   };
});

describe('Remote Playback Plugin', () => {
   beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(checkClientSupport).mockReturnValue(true);
      vi.mocked(checkClientSupportWithAirPlay).mockReturnValue(false);
   });

   it('should initialize plugin without errors', () => {
      const initFunction = (): void => {
         initializePlugin(videojs);
      };

      expect(initFunction).not.toThrow();
      expect(videojs.registerPlugin).toHaveBeenCalled();
   });

   it('routes prompt intent to the active strategy', async () => {
      const listeners: Record<string, () => void> = {};

      const videoElement = document.createElement('video');

      Object.defineProperty(videoElement, 'remote', {
         writable: true,
         value: {
            addEventListener: vi.fn(),
            cancelWatchAvailability: vi.fn().mockResolvedValue(undefined),
            prompt: vi.fn().mockResolvedValue(undefined),
            removeEventListener: vi.fn(),
            watchAvailability: vi.fn().mockResolvedValue(1),
         } as unknown as RemotePlayback,
      });

      let plugin: RemotePlaybackPlugin;

      const player = {
         currentTime: vi.fn(),
         el: vi.fn().mockReturnValue({
            querySelector: vi.fn().mockReturnValue(videoElement),
         }),
         hasPlugin: vi.fn().mockReturnValue(true),
         off: vi.fn(),
         on: vi.fn((event: string, listener: () => void) => {
            listeners[event] = listener;
         }),
         pause: vi.fn(),
         play: vi.fn(),
         ready: vi.fn((callback: () => void) => {
            callback();
         }),
         remotePlayback: vi.fn(() => { return plugin; }),
         trigger: vi.fn((event: string) => {
            listeners[event]?.();
         }),
         usingPlugin: vi.fn().mockReturnValue(true),
      } as unknown as VideoJsPlayer;

      plugin = new RemotePlaybackPlugin(player, { addButtonToControlBar: false });

      expect(player.on).toHaveBeenCalledWith(EVENTS.PROMPT_REQUESTED, expect.any(Function));
      expect(plugin.strategy).toBeDefined();
      if (!plugin.strategy) {
         throw new Error('Expected strategy to be defined');
      }

      const promptSpy = vi.spyOn(plugin.strategy, 'prompt').mockResolvedValue(undefined),
            button = new BaseButton(player);

      button.handleClick();

      expect(player.trigger).toHaveBeenCalledWith(EVENTS.PROMPT_REQUESTED);
      expect(promptSpy).toHaveBeenCalledTimes(1);

      await Promise.resolve();
   });
});
