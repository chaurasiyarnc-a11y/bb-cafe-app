```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FF6B00",
        luxury: {
          black: "#0A0A0A",
          glass: "rgba(255, 255, 255, 0.05)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

---
