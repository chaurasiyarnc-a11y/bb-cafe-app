// Cryptographic SHA-256 Hashing Helper (पिन को सुरक्षित हैश करने के लिए)
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', hashBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// वीडियो या इमेज यूआरएल चेक करने के लिए
export const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0];
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.includes('/video') || cleanUrl.includes('video');
};

// बिल नंबर को 4 डिजिट में फॉर्मेट करने के लिए (उदा: #0023)
export const formatBillNumber = (num: number): string => {
  return String(num).padStart(4, '0');
};
