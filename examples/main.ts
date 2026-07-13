import videojs from 'video.js';
import initializePlugin from '../src/js/index';
import { isPlayerWithRemotePlaybackPlugin } from '../src/js/RemotePlaybackPlugin';
import 'video.js/dist/video-js.css';
import '../src/styles/index.scss';

initializePlugin(videojs);


const player = videojs('remoteplayback-test-player'),
      disposePlayerButton = document.getElementById('dispose-player-btn');

if (isPlayerWithRemotePlaybackPlugin(player)) {
   player.remotePlayback();
} else {
   videojs.log.error('Failed to startup Remote Playback plugin.');
}

function disposeTestPlayer(): void {
   if (!player || player.isDisposed()) {
      return;
   }
   player.dispose();
}

disposePlayerButton?.addEventListener('click', disposeTestPlayer);
