import { defineConfig } from 'vite';

export default defineConfig({
   root: 'examples',
   server: {
      port: 3000,
      open: true,
   },
   // Uncomment to validate this plugin against a forked video.js build locally.
   // resolve: {
   //    alias: {
   //       'video.js': '/absolute/path/to/your/video.js/fork',
   //    },
   // },
});
