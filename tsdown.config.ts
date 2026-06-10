import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: ['@grafana/faro-web-sdk', 'react', 'react/jsx-runtime'],
  },
  dts: true,
  entry: ['src/index.ts'],
  format: ['esm'],
  sourcemap: true,
});
