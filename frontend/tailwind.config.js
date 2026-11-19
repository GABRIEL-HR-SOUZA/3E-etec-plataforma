/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        etec: {
          "azul-gov": "#0f2a52",
          "azul-escuro": "#1C4587",
          "azul-medio": "#2E6DA4",
          roxo: "#5C2D91",
          verde: "#1E7F4A",
          teal: "#0E7C86",
        },
      },
      fontFamily: {
        sans: ['"Source Sans 3"', "system-ui", "sans-serif"],
        heading: ['"Source Serif 4"', "Georgia", "serif"],
        panel: ['"Source Sans 3"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
