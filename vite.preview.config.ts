import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({base:'./', resolve:{alias:[{find:'./assets/react-host.js',replacement:fileURLToPath(new URL('./docs/design/issue122/presentation-exports.ts',import.meta.url))}]}, plugins:[tailwindcss()], build:{outDir:'build/issue122', emptyOutDir:true, target:['safari16.4','chrome111'], rolldownOptions:{input:'docs/design/issue122/index.html'}}});
