/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true, // 👈 यह बहुत जरूरी है (.exe और Android APK में पेज पाथ सही लोड होने के लिए)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
