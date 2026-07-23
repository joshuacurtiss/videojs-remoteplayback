import { beforeEach, describe, expect, it, vi } from 'vitest';
import './mocks/video-js-mock';
import videojs from 'video.js';
import initializePlugin from '../src/js';
import { COMPONENT_NAMES, RemotePlaybackPlugin } from '../src/js/RemotePlaybackPlugin';
import EVENTS from '../src/js/constants/events';
import { AirPlayButton } from '../src/js/buttons/AirPlayButton';
import { BaseButton } from '../src/js/buttons/BaseButton';
import { checkClientSupport, checkClientSupportWithAirPlay } from '../src/js/lib/check-client-support';
import type { VideoJsPlayer } from '../@types/videojs';

vi.mock('../src/js/lib/check-client-support', () => {
   return {
      checkClientSupport: vi.fn(),
      checkClientSupportWithAirPlay: vi.fn(),
   };
});

interface PlayerContext {
   controlBar: {
      addChild: ReturnType<typeof vi.fn>;
      children: ReturnType<typeof vi.fn>;
      getChild: ReturnType<typeof vi.fn>;
   };
   player: VideoJsPlayer;
}

function createPlayerContext(): PlayerContext {
   const listeners: Record<string, () => void> = {},
         videoElement = document.createElement('video');

   const controlBar = {
      addChild: vi.fn(),
      children: vi.fn().mockReturnValue([]),
      getChild: vi.fn().mockReturnValue(null),
   };

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

   const player = {
      currentTime: vi.fn(),
      el: vi.fn().mockReturnValue({
         querySelector: vi.fn().mockReturnValue(videoElement),
      }),
      getChild: vi.fn((componentName: string) => {
         if (componentName === COMPONENT_NAMES.CONTROL_BAR) {
            return controlBar;
         }

         return null;
      }),
      off: vi.fn(),
      on: vi.fn((event: string, listener: () => void) => {
         listeners[event] = listener;
      }),
      pause: vi.fn(),
      play: vi.fn(),
      ready: vi.fn((callback: () => void) => {
         callback();
      }),
      remotePlayback: vi.fn().mockReturnValue({
         log: Object.assign(vi.fn(), {
            error: vi.fn(),
         }),
      }),
      trigger: vi.fn((event: string) => {
         listeners[event]?.();
      }),
      usingPlugin: vi.fn().mockReturnValue(true),
   } as unknown as VideoJsPlayer;

   return {
      controlBar,
      player,
   };
}

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

   it('registers BaseButton when AirPlay is unavailable', () => {
      vi.mocked(checkClientSupportWithAirPlay).mockReturnValue(false);
      initializePlugin(videojs);
      expect(videojs.registerComponent).toHaveBeenCalledWith(COMPONENT_NAMES.REMOTE_PLAYBACK_BUTTON, BaseButton);
   });

   it('registers AirPlayButton when AirPlay is available', () => {
      vi.mocked(checkClientSupportWithAirPlay).mockReturnValue(true);
      initializePlugin(videojs);
      expect(videojs.registerComponent).toHaveBeenCalledWith(COMPONENT_NAMES.REMOTE_PLAYBACK_BUTTON, AirPlayButton);
   });

   it('adds remote playback button to control bar when addButtonToControlBar is true', () => {
      const { controlBar, player } = createPlayerContext();

      new RemotePlaybackPlugin(player, { addButtonToControlBar: true }); // eslint-disable-line no-new
      expect(controlBar.addChild).toHaveBeenCalledTimes(1);
      expect(controlBar.addChild).toHaveBeenCalledWith(
         COMPONENT_NAMES.REMOTE_PLAYBACK_BUTTON,
         expect.anything(),
         expect.anything()
      );
   });

   it('does not add remote playback button to control bar when addButtonToControlBar is false', () => {
      const { controlBar, player } = createPlayerContext(),
            plugin = new RemotePlaybackPlugin(player, { addButtonToControlBar: false });

      expect(plugin.strategy).toBeDefined();
      expect(controlBar.addChild).not.toHaveBeenCalled();
   });

   it('routes prompt intent to the active strategy', async () => {
      const { player } = createPlayerContext(),
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
   });
});
