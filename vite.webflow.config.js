import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Webflow build -> cdn/ (committed): our code as minified ES modules, with public/ (models,
// textures) copied next to them. Webflow loads the entry from jsDelivr at a pinned commit:
//   https://cdn.jsdelivr.net/gh/aquaNeon/amerilux-demo@<commit>/cdn/amerilux-3d.js
// three.js stays external, imported from jsDelivr's +esm builds: every '+esm' file imports three as
// /npm/three@<version>/+esm, so the core and the addons share one instance with no import map.
const { version } = JSON.parse(readFileSync('node_modules/three/package.json', 'utf8'));
const CDN = `https://cdn.jsdelivr.net/npm/three@${version}`;

export default defineConfig({
  build: {
    outDir: 'cdn',
    emptyOutDir: true,
    target: 'es2020',
    minify: true,
    lib: { entry: 'src/amerilux-3d.js', formats: ['es'], fileName: () => 'amerilux-3d.js' },
    rollupOptions: {
      external: (id) => id === 'three' || id.startsWith('three/'),
      output: {
        chunkFileNames: 'amerilux-[name].js', // the 3D chunk loads only when the section nears the viewport
        paths: (id) => (id === 'three' ? `${CDN}/+esm` : `${CDN}/${id.slice('three/'.length)}/+esm`),
      },
    },
  },
});
