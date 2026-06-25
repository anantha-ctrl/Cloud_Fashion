import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,    // expose on the local network (0.0.0.0) so phones/other devices can connect
    port: 5173,
    open: true,
  },
});
