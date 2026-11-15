/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export',  // <--- मैंने इसे बंद कर दिया है ताकि एरर ना आये
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
