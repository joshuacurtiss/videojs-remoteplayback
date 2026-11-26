import { beforeEach, describe, expect, it, vi } from 'vitest';
import './mocks/video-js-mock';
import videojs from 'video.js';
import type { VideoJsPlayer } from '../@types/videojs';
import type { RemotePlaybackStrategy } from '../src/js/RemotePlaybackPlugin';
import EVENTS from '../src/js/constants/events';
import { AirPlayManager } from '../src/js/strategies/AirPlayManager';
import { RemotePlaybackManager } from '../src/js/strategies/RemotePlaybackManager';
import { checkClientSupport, checkClientSupportWithAirPlay } from '../src/js/lib/check-client-support';
import { createBaseButtonConstructor } from '../src/js/buttons';

const BaseButton = createBaseButtonConstructor(videojs);

vi.mock('../src/js/lib/check-client-support', () => {
   return {
      checkClientSupport: vi.fn(),
      checkClientSupportWithAirPlay: vi.fn(),
   };
});

interface StrategyContext {
   player: VideoJsPlayer & {
      tech: ReturnType<typeof vi.fn<() => { el: ReturnType<typeof vi.fn> }>>;
   };
   mediaElement: HTMLMediaElement & {
      remote: {
         addEventListener: ReturnType<typeof vi.fn>;
         cancelWatchAvailability: ReturnType<typeof vi.fn>;
         prompt: ReturnType<typeof vi.fn>;
         removeEventListener: ReturnType<typeof vi.fn>;
         state: 'connected' | 'connecting' | 'disconnected';
         watchAvailability: ReturnType<typeof vi.fn>;
      };
      webkitCurrentPlaybackTargetIsWireless?: boolean;
      webkitShowPlaybackTargetPicker?: ReturnType<typeof vi.fn>;
      addEventListener: ReturnType<typeof vi.fn>;
      removeEventListener: ReturnType<typeof vi.fn>;
   };
   pluginLog: ReturnType<typeof vi.fn> & {
      debug: ReturnType<typeof vi.fn>;
      warn: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
   };
}

interface StrategyFixture {
   name: string;
   kind: RemotePlaybackStrategy['kind'];
   setupEnvironment(): void;
   buildManager(player: VideoJsPlayer): RemotePlaybackStrategy;
   assertPrompt(context: StrategyContext): void;
   assertDispose(context: StrategyContext): void;
   assertEvents(context: StrategyContext): void;
   setAvailability(context: StrategyContext, available: boolean): void;
}

function createContext(tag: 'audio' | 'video'): StrategyContext {
   const pluginLog = vi.fn() as StrategyContext['pluginLog'],
         listeners: Record<string, Array<() => void>> = {};

   pluginLog.debug = vi.fn();
   pluginLog.warn = vi.fn();
   pluginLog.error = vi.fn();

   const remotePlayback = {
      addEventListener: vi.fn(),
      cancelWatchAvailability: vi.fn().mockResolvedValue(undefined),
      prompt: vi.fn().mockResolvedValue(undefined),
      removeEventListener: vi.fn(),
      state: 'disconnected' as const,
      watchAvailability: vi.fn().mockResolvedValue(1),
   };

   const mediaElement = document.createElement(tag) as StrategyContext['mediaElement'];

   Object.defineProperty(mediaElement, 'remote', { value: remotePlayback, configurable: true });
   vi.spyOn(mediaElement, 'addEventListener');
   vi.spyOn(mediaElement, 'removeEventListener');
   mediaElement.webkitCurrentPlaybackTargetIsWireless = false;
   mediaElement.webkitShowPlaybackTargetPicker = vi.fn();

   const player = {
      tech: vi.fn().mockReturnValue({
         el: vi.fn().mockReturnValue(mediaElement),
      }),
      currentTime: vi.fn(),
      off: vi.fn(),
      on: vi.fn((event: string, listener: () => void) => {
         (listeners[event] ||= []).push(listener);
      }),
      pause: vi.fn(),
      play: vi.fn(),
      ready: vi.fn(),
      remotePlayback: vi.fn().mockReturnValue({
         log: pluginLog,
      }),
      trigger: vi.fn((event: string) => {
         listeners[event]?.forEach((listener) => { listener(); });
      }),
      usingPlugin: vi.fn().mockReturnValue(true),
   } as unknown as StrategyContext['player'];

   return {
      player,
      pluginLog,
      mediaElement,
   };
}

const STRATEGIES: StrategyFixture[] = [
   {
      name: 'AirPlayManager',
      kind: 'AirPlay',
      setupEnvironment: () => {
         vi.mocked(checkClientSupport).mockReturnValue(true);
         vi.mocked(checkClientSupportWithAirPlay).mockReturnValue(true);
      },
      buildManager: (player) => {
         return new AirPlayManager(player);
      },
      assertPrompt: ({ mediaElement }) => {
         expect(mediaElement.webkitShowPlaybackTargetPicker).toHaveBeenCalledTimes(1);
      },
      setAvailability: ({ mediaElement }, available) => {
         const event = new Event('webkitplaybacktargetavailabilitychanged');

         Object.defineProperty(event, 'availability', { value: available ? 'available' : 'not-available' });
         mediaElement.dispatchEvent(event);
      },
      assertEvents: ({ mediaElement, player }) => {
         const available = new Event('webkitplaybacktargetavailabilitychanged');

         Object.defineProperty(available, 'availability', { value: 'available' });
         mediaElement.dispatchEvent(available);
         expect(player.trigger).toHaveBeenCalledWith(EVENTS.AVAILABLE);
         mediaElement.webkitCurrentPlaybackTargetIsWireless = true;
         mediaElement.dispatchEvent(new Event('webkitcurrentplaybacktargetiswirelesschanged'));
         expect(player.trigger).toHaveBeenCalledWith(EVENTS.CONNECTED);
         mediaElement.webkitCurrentPlaybackTargetIsWireless = false;
         mediaElement.dispatchEvent(new Event('webkitcurrentplaybacktargetiswirelesschanged'));
         expect(player.trigger).toHaveBeenCalledWith(EVENTS.DISCONNECTED);
      },
      assertDispose: ({ mediaElement }) => {
         expect(mediaElement.removeEventListener).toHaveBeenCalledWith(
            'webkitplaybacktargetavailabilitychanged',
            expect.any(Function)
         );
         expect(mediaElement.removeEventListener).toHaveBeenCalledWith(
            'webkitcurrentplaybacktargetiswirelesschanged',
            expect.any(Function)
         );
      },
   },
   {
      name: 'RemotePlaybackManager',
      kind: 'RemotePlaybackAPI',
      setupEnvironment: () => {
         vi.mocked(checkClientSupport).mockReturnValue(true);
         vi.mocked(checkClientSupportWithAirPlay).mockReturnValue(false);
      },
      buildManager: (player) => {
         return new RemotePlaybackManager(player);
      },
      assertPrompt: ({ mediaElement }) => {
         expect(mediaElement.remote.prompt).toHaveBeenCalledTimes(1);
      },
      setAvailability: ({ mediaElement }, available) => {
         mediaElement.remote.watchAvailability.mock.calls[0][0](available);
      },
      assertEvents: ({ mediaElement, player }) => {
         const availability = mediaElement.remote.watchAvailability.mock.calls[0][0];

         availability(true);
         expect(player.trigger).toHaveBeenNthCalledWith(1, EVENTS.AVAILABLE);
         availability(false);
         expect(player.trigger).toHaveBeenNthCalledWith(2, EVENTS.UNAVAILABLE);
         for (const [ event, expected ] of [
            [ 'connecting', EVENTS.CONNECTING ],
            [ 'connect', EVENTS.CONNECTED ],
            [ 'disconnect', EVENTS.DISCONNECTED ],
         ]) {
            const listener = mediaElement.remote.addEventListener.mock.calls.find(([ name ]) => { return name === event; });

            expect(listener).toBeDefined();
            listener?.[1]();
            expect(player.trigger).toHaveBeenCalledWith(expected);
         }
      },
      assertDispose: ({ mediaElement }) => {
         expect(mediaElement.remote.removeEventListener).toHaveBeenCalledWith('connect', expect.any(Function));
         expect(mediaElement.remote.removeEventListener).toHaveBeenCalledWith('connecting', expect.any(Function));
         expect(mediaElement.remote.removeEventListener).toHaveBeenCalledWith('disconnect', expect.any(Function));
         expect(mediaElement.remote.cancelWatchAvailability).toHaveBeenCalledWith(1);
      },
   },
];

describe.each(STRATEGIES)('$name', (strategy) => {
   describe.each([ 'video', 'audio' ] as const)('with %s', (tag) => {
      let context: StrategyContext,
          manager: RemotePlaybackStrategy;

      beforeEach(() => {
         vi.clearAllMocks();
         strategy.setupEnvironment();
         context = createContext(tag);
         manager = strategy.buildManager(context.player);
         Object.assign(context.player.remotePlayback(), { strategy: manager });
      });

      it('exposes the expected strategy kind', () => {
         expect(manager.kind).toBe(strategy.kind);
      });

      it('returns the player passed to the constructor', () => {
         expect(manager.player).toBe(context.player);
      });

      it('creates a button that delegates clicks to prompt', () => {
         const triggerSpy = vi.spyOn(context.player, 'trigger'),
               mockEvent = {} as videojs.EventTarget.Event,
               button = new BaseButton(context.player);

         expect(button).toBeDefined();
         expect(button?.buildCSSClass()).toContain('vjs-remoteplayback-button');
         button?.handleClick(mockEvent);
         expect(triggerSpy).toHaveBeenCalledTimes(1);
         expect(triggerSpy).toHaveBeenCalledWith(EVENTS.PROMPT_REQUESTED);
      });

      it('prompts using the strategy-specific browser API', async () => {
         await expect(manager.prompt()).resolves.toBeUndefined();
         strategy.assertPrompt(context);
      });

      it('forwards availability and connection events to the player', () => {
         strategy.assertEvents(context);
      });

      it('synchronizes late-added buttons and follows subsequent availability changes', () => {
         const earlyButton = new BaseButton(context.player);

         let buttonCreatedByEvent: videojs.Button | undefined;

         context.player.on(EVENTS.AVAILABLE, () => {
            buttonCreatedByEvent = new BaseButton(context.player);
         });

         expect(earlyButton.el().classList.contains('vjs-hidden')).toBe(true);
         strategy.setAvailability(context, true);
         expect(earlyButton.el().classList.contains('vjs-hidden')).toBe(false);
         expect(buttonCreatedByEvent?.el().classList.contains('vjs-hidden')).toBe(false);

         const lateButton = new BaseButton(context.player);

         expect(lateButton.el().classList.contains('vjs-hidden')).toBe(false);
         strategy.setAvailability(context, false);
         expect(earlyButton.el().classList.contains('vjs-hidden')).toBe(true);
         expect(lateButton.el().classList.contains('vjs-hidden')).toBe(true);
         expect(new BaseButton(context.player).el().classList.contains('vjs-hidden')).toBe(true);
      });

      it('reports an unavailable media element without prompting', async () => {
         context.player.tech.mockReturnValue({
            el: vi.fn().mockReturnValue(null),
         });

         const missingManager = strategy.buildManager(context.player);

         expect(context.pluginLog.error).toHaveBeenCalledWith(expect.stringMatching(/not found/i));
         await missingManager.prompt();
         expect(context.pluginLog.error).toHaveBeenCalledWith(expect.stringMatching(/^no .+ was captured during initialization/i));
         expect(context.mediaElement.remote.prompt).not.toHaveBeenCalled();
         expect(context.mediaElement.webkitShowPlaybackTargetPicker).not.toHaveBeenCalled();
         missingManager.dispose();
      });

      it('disposes of all resources and event listeners', async () => {
         await Promise.resolve();
         manager.dispose();
         strategy.assertDispose(context);
      });
   });
});

describe('RemotePlaybackManager availability monitoring failures', () => {
   beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(checkClientSupport).mockReturnValue(true);
   });

   it('keeps buttons hidden when monitoring is unsupported', async () => {
      const context = createContext('video'),
            error = new DOMException('Monitoring failed', 'NotSupportedError');

      context.mediaElement.remote.watchAvailability.mockRejectedValue(error);
      const manager = new RemotePlaybackManager(context.player);

      Object.assign(context.player.remotePlayback(), { strategy: manager });
      const button = new BaseButton(context.player);

      await vi.waitFor(() => {
         expect(context.pluginLog.error).toHaveBeenCalledWith('Failed to watch availability.', error);
      });
      expect(manager.isAvailable).toBe(false);
      expect(button.el().classList.contains('vjs-hidden')).toBe(true);
      expect(new BaseButton(context.player).el().classList.contains('vjs-hidden')).toBe(true);
      expect(context.player.trigger).not.toHaveBeenCalledWith(EVENTS.AVAILABLE);
   });
});
