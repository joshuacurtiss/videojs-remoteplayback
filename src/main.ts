import videojs from '@silvermine/video.js';
import initializePlugin, { isPlayerWithRemotePlaybackPlugin } from '@silvermine/videojs-remoteplayback'
import '@silvermine/video.js/dist/video-js.css';
import '@silvermine/videojs-remoteplayback/dist/videojs-remoteplayback.css';

initializePlugin(videojs);

const player = videojs('remoteplayback-test-player');

if (isPlayerWithRemotePlaybackPlugin(player)) {
   player.remotePlayback();
} else {
   videojs.log.error('Failed to startup Remote Playback plugin.');
}
