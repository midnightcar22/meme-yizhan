/**
 * MEME·译站 / MemeBridge —— Tailwind 主题配置
 * 由原 index.html 内联 tailwind.config 迁移而来：
 * 暗黑为主，主色紫 #8B5CF6，辅色绿 #1DB954 / 橙 #F4A261
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        bg: "#0F0F0F",
        surface: "#1A1A1A",
        primary: "#8B5CF6",
        accentGreen: "#1DB954",
        accentOrange: "#F4A261",
        txt: "#FFFFFF",
        muted: "#A1A1AA"
      }
    }
  },
  plugins: []
};
