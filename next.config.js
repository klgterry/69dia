// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
      GAS_URL: process.env.NEXT_PUBLIC_GAS_URL, // ← .env.local에서 불러오기
    },
  };
  
  module.exports = nextConfig;
  