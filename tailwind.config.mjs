// tailwind.config.mjs

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    {
      pattern: /bg-\[conic-gradient.*\]/, // ✅ conic-gradient 클래스 보존
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
