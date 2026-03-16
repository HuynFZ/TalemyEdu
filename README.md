# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# Cài đặt lần đầu
## 1. Tải code: Mở terminal và gõ:
```cmd
git clone https://github.com/HuynFZ/TalemyEdu.git
cd TalemyEdu
```

## 2. Cài đặt môi trường:
```cmd
docker-compose up -d
```
## 3. Cài đặt thư viện:
```cmd
docker-compose exec frontend npm install
```

## 4. Đăng nhập để lấy quyền truy cập Database
```cmd
# Cài công cụ Firebase nếu chưa có (cài trên máy thật)
npm install -g firebase-tools
```

## 5. Đăng nhập firebase:
```cmd
firebase login
```
(Đăng nhập bằng chính email mà Huy đã mời ở Bước 2).

## 6. Cài đặt biểu đồ 
```cmd
docker-compose exec frontend npm install recharts
```
## 7. Cài đặt thư viện Kanban
```cmd
 npm install @hello-pangea/dnd
```

## 8. Cài đặt thư viện EmailJS
```cmd
 npm install @emailjs/browser
```