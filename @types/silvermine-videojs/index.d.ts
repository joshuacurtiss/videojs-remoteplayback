declare module '*.scss';
declare module '@silvermine/video.js/dist/*.css';

declare module '@silvermine/video.js' {
   import videojs from 'video.js';
   export = videojs;
}
