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

   public constructor(player: VideoJsPlayer, options: Partial<BaseButtonOptions> = {}) {
      const { addLabelToButton, label } = Object.assign({}, defaultButtonOptions, options);

      super(player, options);

      // Add label if configured to do so
      if (addLabelToButton) {
         const labelEl = document.createElement('span');

         labelEl.classList.add(CSS_CLASSES.BUTTON_LABEL);
         labelEl.textContent = label;
         this.el().appendChild(labelEl);
         this.el().classList.add(CSS_CLASSES.BUTTON_LARGE);
      } else {
         this.controlText(label);
      }

      // Add event listeners
      Object.entries(this._listeners).forEach(([ event, listener ]) => {
         this.player().on(event, listener);
      });
   }

   public buildCSSClass(): string {
      return `${CSS_CLASSES.BUTTON} ${super.buildCSSClass()}`;
   }

   public handleClick(): void {
      this.player().trigger(EVENTS.PROMPT_REQUESTED);
   }

   public dispose(): void {
      Object.entries(this._listeners).forEach(([ event, listener ]) => {
         this.player().off(event, listener);
      });
      super.dispose();
   }

}
