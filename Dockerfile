# Sử dụng Node.js bản ổn định (LTS)
FROM node:20-alpine

# Tạo thư mục làm việc trong container
WORKDIR /app

# Copy file package.json để cài thư viện trước (tận dụng cache của Docker)
COPY package*.json ./

# Cài đặt thư viện
RUN npm install

# Copy toàn bộ code vào container
COPY . .

# Mở port 5173 (thường dùng cho Vite) hoặc 3000
EXPOSE 5173

# Lệnh để chạy code ở chế độ phát triển
CMD ["npm", "run", "dev", "--", "--host"]