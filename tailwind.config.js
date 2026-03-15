/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#1e40af",    // Blue cho hệ thống giáo dục
                success: "#16a34a",    // Green cho Paid
                warning: "#f59e0b",    // Orange cho Pending
                danger: "#dc2626",     // Red cho Overdue
            }
        },
    },
    plugins: [],
}