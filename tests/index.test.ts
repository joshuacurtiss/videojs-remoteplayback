import { beforeEach, describe, expect, it, vi } from 'vitest';
import './mocks/video-js-mock';
import videojs from 'video.js';
import initializePlugin from '../src/js';
import { createButtonConstructor } from '../src/js/buttons';
import { COMPONENT_NAMES, createRemotePlaybackPluginConstructor } from '../src/js/RemotePlaybackPlugin';
import type { RemotePlaybackPlugin, RemotePlaybackPluginOptions } from '../src/js/RemotePlaybackPlugin';
import EVENTS from '../src/js/constants/events';
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

function createPlayerContext(remotePlaybackSupported = true): PlayerContext {
   const listeners: Record<string, () => void> = {},
         videoElement = document.createElement('video');

   const controlBar = {
      addChild: vi.fn(),
      children: vi.fn().mockReturnValue([]),
      getChild: vi.fn().mockReturnValue(null),
   };

   if (remotePlaybackSupported) {
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
   }

   const player = {
      currentTime: vi.fn(),
      tech: vi.fn().mockReturnValue({
         el: vi.fn().mockReturnValue(videoElement),
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
            debug: vi.fn(),
            warn: vi.fn(),
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

   it('defaults the plugin logger to the error level', () => {
      const { player } = createPlayerContext(),
            RemotePlaybackPluginConstructor = createRemotePlaybackPluginConstructor(videojs),
            plugin = new RemotePlaybackPluginConstructor(player) as RemotePlaybackPlugin;

      expect(plugin.log.level).toHaveBeenCalledWith('error');
      expect(plugin.log.warn).not.toHaveBeenCalled();
   });

   it('applies a custom logLevel to the plugin logger', () => {
      const { player } = createPlayerContext(),
            RemotePlaybackPluginConstructor = createRemotePlaybackPluginConstructor(videojs),
            plugin = new RemotePlaybackPluginConstructor(player, { logLevel: 'debug' }) as RemotePlaybackPlugin;

      expect(plugin.log.level).toHaveBeenCalledWith('debug');
      expect(plugin.log.warn).not.toHaveBeenCalled();
   });

   it('warns and falls back to the default for invalid log levels', () => {
      [ 'verbose', 'toString', 'DEFAULT', undefined ].forEach((logLevel) => {
         const { controlBar, player } = createPlayerContext(),
               options: Partial<RemotePlaybackPluginOptions> = {},
               RemotePlaybackPluginConstructor = createRemotePlaybackPluginConstructor(videojs);

         Object.assign(options, { logLevel });

         const plugin = new RemotePlaybackPluginConstructor(player, options) as RemotePlaybackPlugin;

         expect(plugin.log.warn).toHaveBeenCalledWith(expect.stringMatching(/^Invalid logLevel/));
         expect(plugin.log.level).toHaveBeenCalledWith('error');
         expect(controlBar.addChild).toHaveBeenCalledWith(
            COMPONENT_NAMES.REMOTE_PLAYBACK_BUTTON,
            expect.objectContaining({ logLevel: 'error' }),
            expect.anything()
         );
      });
   });

   it('creates a dedicated logger when the base plugin does not provide one', () => {
      const { player } = createPlayerContext(),
            fallbackLogger = videojs.log.createLogger('fallback'),
            BasePlugin = videojs.getPlugin('plugin');

      vi.mocked(videojs.log.createLogger).mockReturnValue(fallbackLogger);

      class PluginWithoutLogger extends BasePlugin {
         public constructor(basePlayer: videojs.Player, options?: object) {
            super(basePlayer, options);
            Object.defineProperty(this, 'log', { value: undefined });
         }
      }

      vi.spyOn(videojs, 'getPlugin').mockReturnValueOnce(PluginWithoutLogger);

      const RemotePlaybackPluginConstructor = createRemotePlaybackPluginConstructor(videojs),
            plugin = new RemotePlaybackPluginConstructor(player) as RemotePlaybackPlugin;

      expect(videojs.log.createLogger).toHaveBeenLastCalledWith('RemotePlayback');
      expect(plugin.log).toBe(fallbackLogger);
      expect(fallbackLogger.level).toHaveBeenCalledWith('error');
      expect(videojs.log.level).not.toHaveBeenCalled();
   });

   it('adds remote playback button to control bar when addButtonToControlBar is true', () => {
      const { controlBar, player } = createPlayerContext(),
            RemotePlaybackPluginConstructor = createRemotePlaybackPluginConstructor(videojs);

      new RemotePlaybackPluginConstructor(player, { addButtonToControlBar: true }); // eslint-disable-line no-new
      expect(controlBar.addChild).toHaveBeenCalledTimes(1);
      expect(controlBar.addChild).toHaveBeenCalledWith(
         COMPONENT_NAMES.REMOTE_PLAYBACK_BUTTON,
         expect.anything(),
         expect.anything()
      );
   });

   it('does not add remote playback button to control bar when addButtonToControlBar is false', () => {
      const { controlBar, player } = createPlayerContext(),
            RemotePlaybackPluginConstructor = createRemotePlaybackPluginConstructor(videojs),
            plugin = new RemotePlaybackPluginConstructor(player, { addButtonToControlBar: false }) as RemotePlaybackPlugin;

      expect(plugin.strategy).toBeDefined();
      expect(controlBar.addChild).not.toHaveBeenCalled();
   });

   it('does not add remote playback button when the client is unsupported', () => {
      vi.mocked(checkClientSupport).mockReturnValue(false);

      const { controlBar, player } = createPlayerContext(false),
            RemotePlaybackPluginConstructor = createRemotePlaybackPluginConstructor(videojs),
            plugin = new RemotePlaybackPluginConstructor(player) as RemotePlaybackPlugin;

      expect(plugin.strategy).toBeUndefined();
      expect(controlBar.addChild).not.toHaveBeenCalled();
   });

   it('routes prompt intent to the active strategy', async () => {
      const { player } = createPlayerContext(),
            RemotePlaybackPluginConstructor = createRemotePlaybackPluginConstructor(videojs),
            plugin = new RemotePlaybackPluginConstructor(player, { addButtonToControlBar: false }) as RemotePlaybackPlugin;

      expect(player.on).toHaveBeenCalledWith(EVENTS.PROMPT_REQUESTED, expect.any(Function));
      expect(plugin.strategy).toBeDefined();
      if (!plugin.strategy) {
         throw new Error('Expected strategy to be defined');
      }

      const promptSpy = vi.spyOn(plugin.strategy, 'prompt').mockResolvedValue(undefined),
            RemotePlaybackButton = createButtonConstructor(videojs),
            mockEvent = {} as videojs.EventTarget.Event,
            button = new RemotePlaybackButton(player);

      button.handleClick(mockEvent);

      expect(player.trigger).toHaveBeenCalledWith(EVENTS.PROMPT_REQUESTED);
      expect(promptSpy).toHaveBeenCalledTimes(1);
   });
});
