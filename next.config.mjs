/** @type {import('next').NextConfig} */
// यह चेक करेगा कि क्या हम मोबाइल APK बना रहे हैं
const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig = {
  reactStrictMode: true,
  
  // यदि मोबाइल बिल्ड चल रहा है, तो ही एक्सपोर्ट सेटिंग्स लागू करें
  ...(isStaticExport ? {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true,
    },
  } : {})
};

export default nextConfig;
