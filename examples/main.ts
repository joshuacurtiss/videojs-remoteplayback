import videojs from 'video.js';
import initializePlugin from '../src/js/index';
import { isPlayerWithRemotePlaybackPlugin } from '../src/js/RemotePlaybackPlugin';
import 'video.js/dist/video-js.css';
import '../src/styles/index.scss';

initializePlugin(videojs);

const videoPlayer = videojs('remoteplayback-video-player'),
      audioPlayer = videojs('remoteplayback-audio-player');

[ videoPlayer, audioPlayer ].forEach((testPlayer) => {
   if (isPlayerWithRemotePlaybackPlugin(testPlayer)) {
      testPlayer.remotePlayback();
   } else {
      videojs.log.error('Failed to startup Remote Playback plugin.');
   }
});

function disposePlayer(this: HTMLElement): void {
   const mediaEl = this.closest('.player-container')?.querySelector('video, audio'),
         player = mediaEl?.id ? videojs.getPlayer(mediaEl.id) : undefined;

   if (!player || player.isDisposed()) {
      return;
   }
   player.dispose();
}

document.querySelectorAll<HTMLButtonElement>('button.dispose-btn').forEach((btn) => {
   btn.addEventListener('click', disposePlayer);
});
