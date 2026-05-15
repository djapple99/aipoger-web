/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! 警告 !!
    // 允許在有 TypeScript 錯誤時強行編譯，為了快速測試上線
    ignoreBuildErrors: true,
  },
  // eslint 配置已移除（已移到 .eslintrc.json 管理）
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;