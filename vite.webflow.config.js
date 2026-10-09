import { defineConfig } from 'vite';

// Webflow build -> dist-webflow/ (committed): our code as one minified ES module, with public/ (models,
// textures) copied next to it. Webflow loads it from jsDelivr at a pinned commit:
//   https://cdn.jsdelivr.net/gh/aquaNeon/amerilux-demo@<commit>/dist-webflow/amerilux-3d.js
// three.js stays external: the embed's import map points 'three' at jsDelivr's npm build.
export default defineConfig({
  build: {
    outDir: 'dist-webflow',
    emptyOutDir: true,
    target: 'es2020',
    minify: true,
    lib: { entry: 'src/amerilux-3d.js', formats: ['es'], fileName: () => 'amerilux-3d.js' },
    rollupOptions: {
      external: (id) => id === 'three' || id.startsWith('three/'),
      output: { codeSplitting: false },
    },
  },
});
