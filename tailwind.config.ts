import type { Config } from "tailwindcss";
export default { content:["./app/**/*.{ts,tsx}","./components/**/*.{ts,tsx}"], theme:{extend:{colors:{ink:"#102a5d",sky:"#eaf2ff",lime:"#c7ff62"},boxShadow:{soft:"0 16px 45px rgba(24,61,125,.10)"}}},plugins:[] } satisfies Config;
