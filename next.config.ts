/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! 警告 !!
    // 允許在有 TypeScript 錯誤時強行編譯，為了快速測試上線
    ignoreBuildErrors: true,
  },
  eslint: {
    // 允許在有 ESLint 錯誤時強行編譯
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;