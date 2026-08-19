import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-tutahtitah.webp'],
      manifest: {
        name: 'Aplikasi Customer Tutah Titah',
        short_name: 'Tutah Titah',
        description: 'Layanan Kurir dan Jastip Fleksibel Cikalong Wetan',
        theme_color: '#004aad',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-tutahtitah.webp',
            sizes: '64x64 144x144 180x180 192x192 256x256 512x512',
            type: 'image/webp'
          },
          {
            src: 'icon-tutahtitah.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})
