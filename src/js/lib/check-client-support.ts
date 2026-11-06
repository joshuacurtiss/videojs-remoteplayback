/**
 * Checks if the current client supports Remote Playback API.
 */
export function checkClientSupport(): boolean {
   return typeof window !== 'undefined' &&
      'HTMLMediaElement' in window &&
      'remote' in HTMLMediaElement.prototype;
}

/**
 * Checks if the current client supports AirPlay functionality.
 */
export function checkClientSupportWithAirPlay(): boolean {
   return typeof window !== 'undefined' &&
      'HTMLMediaElement' in window &&
      'WebKitPlaybackTargetAvailabilityEvent' in window;
}
