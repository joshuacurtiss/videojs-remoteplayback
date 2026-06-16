import videojs from '@silvermine/video.js';
import type { ComponentOptions } from '@silvermine/video.js';
import type { VideoJsPlayer } from '../../../@types/videojs';
import EVENTS from '../constants/events';

// INTERFACES

export interface BaseButtonOptions extends ComponentOptions {
   addLabelToButton: boolean;
   label: string;
}

// DEFAULTS

export const defaultButtonOptions: BaseButtonOptions = {
   addLabelToButton: true,
   label: 'Cast',
};

// CONSTANTS

const CSS_CLASSES = {
   BUTTON: 'vjs-remoteplayback-button',
   BUTTON_LARGE: 'vjs-remoteplayback-button-lg',
   BUTTON_LABEL: 'vjs-remoteplayback-button-label',
   CONNECTED: 'connected',
   CONNECTING: 'connecting',
   ICON_PLACEHOLDER: 'vjs-icon-placeholder',
} as const;

const Button = videojs.getComponent('Button');

export class BaseButton extends Button {
   private readonly _listeners = {
      [EVENTS.CONNECTING]: () => {
         this.removeClass(CSS_CLASSES.CONNECTED);
         this.addClass(CSS_CLASSES.CONNECTING);
      },
      [EVENTS.CONNECTED]: () => {
         this.removeClass(CSS_CLASSES.CONNECTING);
         this.addClass(CSS_CLASSES.CONNECTED);
      },
      [EVENTS.DISCONNECTED]: () => {
         this.removeClass(CSS_CLASSES.CONNECTING);
         this.removeClass(CSS_CLASSES.CONNECTED);
      },
      [EVENTS.AVAILABLE]: () => {
         this.show();
      },
      [EVENTS.UNAVAILABLE]: () => {
         this.hide();
      },
   };
   private readonly _options: BaseButtonOptions;
   private readonly _player: VideoJsPlayer;

   public constructor(player: VideoJsPlayer, options: Partial<BaseButtonOptions> = {}) {
      super(player, options);

      this._options = Object.assign({}, defaultButtonOptions, options);
      this._player = player;

      // Add label if configured to do so
      if (this._options.addLabelToButton) {
         const labelEl = document.createElement('span');

         labelEl.classList.add(CSS_CLASSES.BUTTON_LABEL);
         labelEl.textContent = this._options.label;
         this.el().appendChild(labelEl);
         this.el().classList.add(CSS_CLASSES.BUTTON_LARGE);
      } else {
         this.controlText(this._options.label);
      }

      // Add event listeners
      Object.entries(this._listeners).forEach(([ event, listener ]) => {
         this._player.on(event, listener);
      });
   }

   public buildCSSClass(): string {
      return `${CSS_CLASSES.BUTTON} ${super.buildCSSClass()}`;
   }

   public handleClick(): void {
      this._player.trigger(EVENTS.PROMPT_REQUESTED);
   }

   public dispose(): void {
      Object.entries(this._listeners).forEach(([ event, listener ]) => {
         this._player.off(event, listener);
      });
      super.dispose();
   }

}
