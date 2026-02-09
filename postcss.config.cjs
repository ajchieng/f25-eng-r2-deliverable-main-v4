// PostCSS plugin chain executed for every CSS build.
const config = {
  plugins: {
    // Expands Tailwind directives (`@tailwind`, `@apply`, etc.) into real CSS.
    tailwindcss: {},
    // Adds vendor prefixes for browser compatibility.
    autoprefixer: {},
  },
};

module.exports = config;
