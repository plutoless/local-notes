import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  base: './', define: {'process.env.NODE_ENV': JSON.stringify('production')}, plugins: [tailwindcss()],
  build: {outDir: 'build/web', emptyOutDir: true, target: ['safari16.4', 'chrome111'],
    lib: {entry: 'web/react/host.tsx', formats: ['es'], fileName: () => 'assets/react-host.js', cssFileName: 'assets/react-host'},
    rolldownOptions: {output: {chunkFileNames: 'assets/[name]-[hash].js'}}}
});
