/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0F172A",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        text: "#334155",
        muted: "#94A3B8",
        accent: "#2563EB"
      },
      borderRadius: {
        DEFAULT: "4px"
      },
      fontFamily: {
        heading: ["Cabinet Grotesk", "ui-sans-serif", "system-ui"],
        body: ["Satoshi", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"]
      }
    }
  },
  plugins: []
};

