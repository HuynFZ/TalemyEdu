import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        headers: {
            // Dòng này cực kỳ quan trọng để xử lý lỗi COOP
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        },
    },
})