import { afterEach, describe, expect, it, vi } from 'vitest';
import {
   checkClientSupport,
   checkClientSupportWithAirPlay,
} from '../src/js/lib/check-client-support';

describe('check-client-support', () => {

   afterEach(() => {
      // These properties don't exist in a stock environment (since RemotePlayback API
      // isn't standard yet). So we always remove them after each test.
      delete (HTMLVideoElement.prototype as any).remote;
      delete (HTMLMediaElement.prototype as any).remote;
      delete (window as any).WebKitPlaybackTargetAvailabilityEvent;
   });

   it('recognizes Remote Playback API inherited from the media prototype', () => {
      Object.defineProperty(HTMLMediaElement.prototype, 'remote', { value: {}, writable: true, configurable: true });
      expect(checkClientSupport()).toBe(true);
   });

   it('does not recognize Remote Playback API added only to the video prototype', () => {
      Object.defineProperty(HTMLVideoElement.prototype, 'remote', { value: {}, writable: true, configurable: true });
      expect(checkClientSupport()).toBe(false);
   });

   it('returns false when Remote Playback API is unavailable', () => {
      expect(checkClientSupport()).toBe(false);
   });

   it('returns true for AirPlay support when Remote Playback API and WebKit event are available', () => {
      Object.defineProperty(window, 'WebKitPlaybackTargetAvailabilityEvent', { value: {}, writable: true, configurable: true });
      expect(checkClientSupportWithAirPlay()).toBe(true);
   });

   it('returns false for AirPlay support when WebKit availability event is unavailable', () => {
      expect(checkClientSupportWithAirPlay()).toBe(false);
   });

   it('returns false when window is unavailable', () => {
      vi.stubGlobal('window', undefined);
      try {
         expect(checkClientSupport()).toBe(false);
         expect(checkClientSupportWithAirPlay()).toBe(false);
      } finally {
         vi.unstubAllGlobals();
      }
   });
});
