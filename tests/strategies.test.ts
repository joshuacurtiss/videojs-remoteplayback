import { beforeEach, describe, expect, it, vi } from 'vitest';
import './mocks/video-js-mock';
import type { VideoJsPlayer } from '../@types/videojs';
import type { RemotePlaybackStrategy } from '../src/js/RemotePlaybackPlugin';
import EVENTS from '../src/js/constants/events';
import { AirPlayManager } from '../src/js/strategies/AirPlayManager';
import { RemotePlaybackManager } from '../src/js/strategies/RemotePlaybackManager';
import { checkClientSupport, checkClientSupportWithAirPlay } from '../src/js/lib/check-client-support';
import { BaseButton } from '../src/js/buttons/BaseButton';

vi.mock('../src/js/lib/check-client-support', () => {
   return {
      checkClientSupport: vi.fn(),
      checkClientSupportWithAirPlay: vi.fn(),
   };
});

interface StrategyContext {
   player: VideoJsPlayer;
   videoElement: HTMLVideoElement & {
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
}

function createContext(): StrategyContext {
   const pluginLog = vi.fn() as StrategyContext['pluginLog'];

   pluginLog.error = vi.fn();

   const remotePlayback = {
      addEventListener: vi.fn(),
      cancelWatchAvailability: vi.fn().mockResolvedValue(undefined),
      prompt: vi.fn().mockResolvedValue(undefined),
      removeEventListener: vi.fn(),
      state: 'disconnected' as const,
      watchAvailability: vi.fn().mockResolvedValue(undefined),
   };

   const videoElement = document.createElement('video') as StrategyContext['videoElement'];

   (videoElement.remote as any) = remotePlayback;
   videoElement.addEventListener = vi.fn();
   videoElement.removeEventListener = vi.fn();
   videoElement.webkitCurrentPlaybackTargetIsWireless = false;
   videoElement.webkitShowPlaybackTargetPicker = vi.fn();

   const player = {
      el: vi.fn().mockReturnValue({
         querySelector: vi.fn().mockReturnValue(videoElement),
      }),
      off: vi.fn(),
      on: vi.fn(),
      remotePlayback: vi.fn().mockReturnValue({
         log: pluginLog,
      }),
      trigger: vi.fn(),
      usingPlugin: vi.fn().mockReturnValue(true),
   } as unknown as StrategyContext['player'];

   return {
      player,
      pluginLog,
      videoElement,
   };
}

const STRATEGIES: StrategyFixture[] = [
   {
      name: 'AirPlayManager',
      kind: 'AirPlay',
      setupEnvironment: () => {
         vi.mocked(checkClientSupport).mockReturnValue(true);
         vi.mocked(checkClientSupportWithAirPlay).mockReturnValue(true);

         Object.defineProperty(HTMLVideoElement.prototype, 'remote', {
            configurable: true,
            value: {},
            writable: true,
         });

         Object.defineProperty(HTMLVideoElement.prototype, 'webkitShowPlaybackTargetPicker', {
            configurable: true,
            value: vi.fn(),
            writable: true,
         });

         Object.defineProperty(HTMLVideoElement.prototype, 'webkitCurrentPlaybackTargetIsWireless', {
            configurable: true,
            value: false,
            writable: true,
         });

         Object.defineProperty(window, 'WebKitPlaybackTargetAvailabilityEvent', {
            configurable: true,
            value: class MockWebKitPlaybackTargetAvailabilityEvent extends Event {
               public availability: 'available' | 'not-available' = 'available';
            },
            writable: true,
         });
      },
      buildManager: (player) => {
         return new AirPlayManager(player);
      },
      assertPrompt: ({ videoElement }) => {
         expect(videoElement.webkitShowPlaybackTargetPicker).toHaveBeenCalledTimes(1);
      },
      assertDispose: ({ videoElement }) => {
         expect(videoElement.removeEventListener).toHaveBeenCalledWith(
            'webkitplaybacktargetavailabilitychanged',
            expect.any(Function)
         );
         expect(videoElement.removeEventListener).toHaveBeenCalledWith(
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

         Object.defineProperty(HTMLVideoElement.prototype, 'remote', {
            configurable: true,
            value: {},
            writable: true,
         });
      },
      buildManager: (player) => {
         return new RemotePlaybackManager(player);
      },
      assertPrompt: ({ videoElement }) => {
         expect(videoElement.remote.prompt).toHaveBeenCalledTimes(1);
      },
      assertDispose: ({ videoElement }) => {
         expect(videoElement.remote.removeEventListener).toHaveBeenCalledWith('connect', expect.any(Function));
         expect(videoElement.remote.removeEventListener).toHaveBeenCalledWith('connecting', expect.any(Function));
         expect(videoElement.remote.removeEventListener).toHaveBeenCalledWith('disconnect', expect.any(Function));
         expect(videoElement.remote.cancelWatchAvailability).toHaveBeenCalledTimes(1);
      },
   },
];

describe.each(STRATEGIES)('$name', (strategy) => {
   let context: StrategyContext,
       manager: RemotePlaybackStrategy;

   beforeEach(() => {
      vi.clearAllMocks();
      strategy.setupEnvironment();
      context = createContext();
      manager = strategy.buildManager(context.player);
   });

   it('exposes the expected strategy kind', () => {
      expect(manager.kind).toBe(strategy.kind);
   });

   it('returns the player passed to the constructor', () => {
      expect(manager.player).toBe(context.player);
   });

   it('creates a button that delegates clicks to prompt', () => {
      const triggerSpy = vi.spyOn(context.player, 'trigger'),
            button = new BaseButton(context.player);

      expect(button).toBeDefined();
      expect(button?.buildCSSClass()).toContain('vjs-remoteplayback-button');
      button?.handleClick();
      expect(triggerSpy).toHaveBeenCalledTimes(1);
      expect(triggerSpy).toHaveBeenCalledWith(EVENTS.PROMPT_REQUESTED);
   });

   it('prompts using the strategy-specific browser API', async () => {
      await expect(manager.prompt()).resolves.toBeUndefined();
      strategy.assertPrompt(context);
   });

   it('disposes of all resources and event listeners', () => {
      manager.dispose();
      strategy.assertDispose(context);
   });
});
