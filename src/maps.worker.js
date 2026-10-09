// Builds procedural surface maps off the main thread (see prepareMaps in materials.js)
import { GENERATORS } from './maps-gen.js';

self.onmessage = ({ data: { name, fn, args } }) => {
  const m = GENERATORS[fn](...args);
  self.postMessage({ name, ...m }, [m.map.buffer, m.normal.buffer]);
};
