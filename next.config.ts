/** @type {import('next').NextConfig} */
const nextConfig = {
  // eslint 配置已移除（已移到 .eslintrc.json 管理）
  // 鎖定 Turbopack 專案根目錄（消除多 lockfile 警告）；與 OAuth /auth/callback 無直接關聯
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
