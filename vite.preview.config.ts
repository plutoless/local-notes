import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({base:'./', plugins:[tailwindcss()], build:{outDir:'build/issue122', emptyOutDir:true, target:['safari16.4','chrome111'], rolldownOptions:{input:'docs/design/issue122/index.html'}}});
