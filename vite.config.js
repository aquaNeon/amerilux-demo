import { defineConfig } from 'vite';

// One build, two outputs:
//   dist/index.html      demo page (Figma replica)
//   dist/amerilux-3d.js  stable, unhashed embed for Webflow (+ dist/models/*.glb)
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    modulePreload: false,
    rollupOptions: {
      output: {
        entryFileNames: 'amerilux-3d.js',
        chunkFileNames: 'amerilux-[name].js',
        assetFileNames: (a) => (a.names?.[0]?.endsWith('.css') ? 'demo.css' : 'assets/[name][extname]'),
      },
    },
  },
});
