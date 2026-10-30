/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  basePath: '',
  assetPrefix: './', // 👈 यह सबसे जरूरी है: इससे सारी JS/CSS फाइलें रिलेटिव पाथ से लोड होंगी और सफेद स्क्रीन खत्म हो जाएगी
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
