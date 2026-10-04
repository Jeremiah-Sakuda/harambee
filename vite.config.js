import { defineConfig } from 'vite';
export default defineConfig({server:{port:5171, strictPort:true, watch:{usePolling:true,interval:700,ignored:["**/data/**"]}, proxy:{'/api':'http://127.0.0.1:3101'}}});
