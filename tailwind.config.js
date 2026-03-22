/** @type {import('tailwindcss').Config} */

// tailwind.config.js
// Tailwind scans the files listed in `content` and only includes CSS classes
// that are actually used. This keeps the final CSS bundle tiny in production.

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",       // All files inside /app
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // All files inside /components
    "./lib/**/*.{js,ts,jsx,tsx}",            // Utility functions that render JSX
  ],
  theme: {
    extend: {
      // Custom brand colors — Marc's palette: red + black.
      // Keeping the same token names (brand-green, brand-dark, etc.) so no
      // component code needs to change — only the values here.
      colors: {
        brand: {
          green:  "#dc2626",   // Primary red  — CTAs, buttons, active states
          light:  "#f5f5f5",   // Near-white   — body text on dark backgrounds
          dark:   "#111111",   // Near-black   — nav, hero, headings
          cream:  "#f9f9f9",   // Light gray   — page background
        },
      },
      // Custom font families. Add Google Fonts import to app/globals.css.
      fontFamily: {
        sans:    ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Playfair Display", "ui-serif", "Georgia"],
      },
    },
  },
  plugins: [],
};
