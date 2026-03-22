// postcss.config.js
// PostCSS is a CSS transformer that runs when Next.js compiles your CSS files.
// Tailwind is a PostCSS plugin, so it must be listed here to work.
// autoprefixer adds vendor prefixes like -webkit- to CSS properties that need
// them for cross-browser support. Both run automatically on every build.

module.exports = {
  plugins: {
    tailwindcss:  {},
    autoprefixer: {},
  },
};
