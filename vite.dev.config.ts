import { defineConfig } from 'vite';

export default defineConfig({
   root: 'src',
   server: {
      port: 3000,
      open: true,
   },
   resolve: {
      alias: {
         'video.js': '@silvermine/video.js',
      }
   },
});
