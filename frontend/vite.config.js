import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://backend:3000',
                changeOrigin: true
            }
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                admin: 'admin.html',
                counter: 'counter.html'
            }
        }
    },
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'Despesa Fácil',
                short_name: 'Despesa Fácil',
                description: 'Gestão de despesas por CNPJ',
                theme_color: '#6366f1',
                background_color: '#0f1117',
                display: 'standalone',
                orientation: 'portrait',
                lang: 'pt-BR',
                start_url: '/',
                icons: [
                    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                navigateFallbackDenylist: [/^\/api\//],
                runtimeCaching: [
                    {
                        urlPattern: /^\/api\//,
                        handler: 'NetworkOnly'
                    }
                ]
            }
        })
    ]
});
