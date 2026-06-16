import { beforeEach, describe, expect, it, vi } from 'vitest';
import './mocks/video-js-mock';
import type { MockButton } from './mocks/video-js-mock';
import type { VideoJsPlayer } from '../@types/videojs';
import EVENTS from '../src/js/constants/events';
import { BaseButton } from '../src/js/buttons/BaseButton';
import { AirPlayButton } from '../src/js/buttons/AirPlayButton';

interface ListenerMap {
   [event: string]: () => void;
}

interface TestContext {
   player: VideoJsPlayer & {
      on: ReturnType<typeof vi.fn>;
      off: ReturnType<typeof vi.fn>;
      trigger: ReturnType<typeof vi.fn>;
      usingPlugin: ReturnType<typeof vi.fn>;
      remotePlayback: ReturnType<typeof vi.fn>;
   };
   listeners: ListenerMap;
   pluginError: ReturnType<typeof vi.fn>;
}

function createContext(): TestContext {
   const listeners: ListenerMap = {},
         pluginError = vi.fn(),
         on = vi.fn((event: string, listener: () => void) => { listeners[event] = listener; }),
         off = vi.fn(),
         trigger = vi.fn(),
         usingPlugin = vi.fn().mockReturnValue(true),
         remotePlayback = vi.fn().mockReturnValue({ log: { error: pluginError } });

   const player = {
      on,
      off,
      usingPlugin,
      remotePlayback,
      trigger,
   } as TestContext['player'];

   return {
      player,
      listeners,
      pluginError,
   };
}

describe('BaseButton', () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   it('registers listeners and appends a label by default', () => {
      const { player } = createContext(),
            button = new BaseButton(player, { label: 'AirPlay' }),
            label = button.el().querySelector('.vjs-remoteplayback-button-label');

      expect(player.on).toHaveBeenCalledTimes(5);
      expect(player.on).toHaveBeenCalledWith(EVENTS.CONNECTING, expect.any(Function));
      expect(player.on).toHaveBeenCalledWith(EVENTS.CONNECTED, expect.any(Function));
      expect(player.on).toHaveBeenCalledWith(EVENTS.DISCONNECTED, expect.any(Function));
      expect(player.on).toHaveBeenCalledWith(EVENTS.AVAILABLE, expect.any(Function));
      expect(player.on).toHaveBeenCalledWith(EVENTS.UNAVAILABLE, expect.any(Function));

      expect(button.el().classList.contains('vjs-remoteplayback-button-lg')).toBe(true);
      expect(label?.textContent).toBe('AirPlay');
   });

   it('uses controlText when label rendering is disabled', () => {
      const { player } = createContext(),
            button = new BaseButton(player, { addLabelToButton: false, label: 'Cast' });

      expect((button as unknown as MockButton)._controlText).toBe('Cast');
      expect(button.el().querySelector('.vjs-remoteplayback-button-label')).toBeNull();
   });

   it('reacts to player events with expected class and visibility changes', () => {
      const { player, listeners } = createContext(),
            button = new BaseButton(player);

      const showSpy = vi.spyOn(button, 'show'),
            hideSpy = vi.spyOn(button, 'hide');

      listeners[EVENTS.CONNECTING]?.();
      expect(button.el().classList.contains('connecting')).toBe(true);
      expect(button.el().classList.contains('connected')).toBe(false);

      listeners[EVENTS.CONNECTED]?.();
      expect(button.el().classList.contains('connecting')).toBe(false);
      expect(button.el().classList.contains('connected')).toBe(true);

      listeners[EVENTS.DISCONNECTED]?.();
      expect(button.el().classList.contains('connecting')).toBe(false);
      expect(button.el().classList.contains('connected')).toBe(false);

      listeners[EVENTS.AVAILABLE]?.();
      listeners[EVENTS.UNAVAILABLE]?.();

      expect(showSpy).toHaveBeenCalledTimes(1);
      expect(hideSpy).toHaveBeenCalledTimes(1);
   });

   it('buildCSSClass prepends the component class', () => {
      const { player } = createContext(),
            button = new BaseButton(player),
            classes = button.buildCSSClass();

      expect(classes).toContain('vjs-remoteplayback-button');
      expect(classes).toContain('vjs-control');
   });

   it('handleClick emits a remote playback intent', () => {
      const { player } = createContext(),
            button = new BaseButton(player);

      button.handleClick();
      expect(player.trigger).toHaveBeenCalledTimes(1);
   });

   it('dispose removes all listeners and calls super.dispose', () => {
      const { player, listeners } = createContext(),
            button = new BaseButton(player);

      button.dispose();

      expect(player.off).toHaveBeenCalledTimes(5);
      expect(player.off).toHaveBeenCalledWith(EVENTS.CONNECTING, listeners[EVENTS.CONNECTING]);
      expect(player.off).toHaveBeenCalledWith(EVENTS.CONNECTED, listeners[EVENTS.CONNECTED]);
      expect(player.off).toHaveBeenCalledWith(EVENTS.DISCONNECTED, listeners[EVENTS.DISCONNECTED]);
      expect(player.off).toHaveBeenCalledWith(EVENTS.AVAILABLE, listeners[EVENTS.AVAILABLE]);
      expect(player.off).toHaveBeenCalledWith(EVENTS.UNAVAILABLE, listeners[EVENTS.UNAVAILABLE]);
      expect((button as unknown as MockButton)._superDisposed).toBe(true);
   });
});

describe('AirPlayButton', () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   it('uses AirPlay defaults and prepends its CSS class', () => {
      const { player } = createContext(),
            button = new AirPlayButton(player),
            label = button.el().querySelector('.vjs-remoteplayback-button-label'),
            classes = button.buildCSSClass();

      expect(label?.textContent).toBe('AirPlay');
      expect(button.el().classList.contains('vjs-remoteplayback-button-lg')).toBe(true);
      expect(classes).toContain('airplay');
      expect(classes).toContain('vjs-remoteplayback-button');
   });
});
