import { vi } from 'vitest';
import type { VideoJs } from '../../@types/videojs';
import type { VideoJsPlayer } from '../../@types/videojs';

export class MockButton {
   // These properties are used by the tests to verify that the button
   // is configured and disposed correctly.
   public _controlText = '';
   public _superDisposed = false;
   private _el: HTMLButtonElement;
   private _player: VideoJsPlayer;

   public constructor(player: VideoJsPlayer) {
      this._player = player;
      this._el = document.createElement('button');
      this._el.className = this.buildCSSClass();
   }

   public el(): HTMLButtonElement {
      return this._el;
   }

   public player(): VideoJsPlayer {
      return this._player;
   }

   public addClass(className: string): void {
      this._el.classList.add(className);
   }

   public removeClass(className: string): void {
      this._el.classList.remove(className);
   }

   public show(): void {
      this._el.classList.remove('vjs-hidden');
   }

   public hide(): void {
      this._el.classList.add('vjs-hidden');
   }

   public localize(text: string): string {
      return text;
   }

   public controlText(text: string): void {
      this._controlText = text;
   }

   public buildCSSClass(): string {
      return 'vjs-control';
   }

   public dispose(): void {
      this._superDisposed = true;
   }
}

vi.mock('video.js', () => {
   const createLog = (): MockPlugin['log'] => {
      const log = vi.fn() as MockPlugin['log'];

      log.debug = vi.fn();
      log.warn = vi.fn();
      log.error = vi.fn();
      log.level = vi.fn();
      log.levels = {
         DEFAULT: '',
         all: '',
         off: '',
         debug: '',
         info: '',
         warn: '',
         error: '',
      };

      return log;
   };

   class MockPlugin {
      public readonly log: ReturnType<typeof vi.fn> &
         Record<'debug' | 'warn' | 'error' | 'level', ReturnType<typeof vi.fn>> &
         Pick<VideoJs['log'], 'levels'>;
      public readonly player: VideoJsPlayer;

      public constructor(player: VideoJsPlayer) {
         this.log = createLog();
         this.player = player;
      }

      public dispose(): void {
         return;
      }
   }

   const getComponent = vi.fn((name: string) => {
      if (name === 'Button') {
         return MockButton;
      }

      return undefined;
   });

   const getPlugin = vi.fn((name: string) => {
      if (name === 'plugin') {
         return MockPlugin;
      }

      return undefined;
   });

   return {
      default: {
         VERSION: 'test-videojs-version',
         log: Object.assign(createLog(), {
            createLogger: vi.fn(() => {
               return createLog();
            }),
         }),
         registerPlugin: vi.fn(),
         registerComponent: vi.fn(),
         getPlugin,
         getComponent,
      } as unknown as VideoJs,
   };
});
