import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    
    // THÊM PHẦN SERVER PROXY NÀY VÀO ĐỂ SỬA LỖI 404 Ở LOCAL
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000', // ĐỔI SỐ 5000 THÀNH ĐÚNG PORT MÀ FILE sendcontact.js ĐANG CHẠY
                changeOrigin: true,
                secure: false,
            }
        }
    },

    // Giữ nguyên phần build cũ của bạn
    build: {
        chunkSizeWarningLimit: 1600, 
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        return id.toString().split('node_modules/')[1].split('/')[0].toString();
                    }
                },
            },
        },
    },
})