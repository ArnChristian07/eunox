/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: "#F8F7F2",
        "warm-stone": "#EAE8E1",
        "warm-border": "#E4E2DA",
        charcoal: "#141413",
        "warm-gray": "#66655E",
        "muted-gray": "#8A8880",
        "nox-lime": "#C5EC4B",
      },
    },
  },
  plugins: [],
};
