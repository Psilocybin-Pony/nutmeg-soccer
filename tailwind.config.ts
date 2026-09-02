import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        cream: "#FDF6E3",
        ink: "#1A1A1A",
        warmgray: "#6B6455",
        grass: {
          DEFAULT: "#58B368",
          light: "#6BC27A",
          dark: "#3F8F4E",
        },
        tangerine: "#FF7A1A",
        lemon: "#FFC93C",
        goalred: "#E23B3B",
        sky: "#3BA7E0",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ['"Luckiest Guy"', '"Nunito"', "system-ui", "sans-serif"],
        sans: ['"Nunito"', "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        comic: "4px 4px 0 #1A1A1A",
        "comic-sm": "3px 3px 0 #1A1A1A",
        "comic-lg": "7px 7px 0 #1A1A1A",
        "comic-press": "1px 1px 0 #1A1A1A",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "ball-bob": {
          "0%, 100%": { transform: "translateY(0) rotate(-6deg)" },
          "50%": { transform: "translateY(-12px) rotate(8deg)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.6) rotate(-6deg)", opacity: "0" },
          "70%": { transform: "scale(1.08) rotate(2deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "slam-in": {
          "0%": { transform: "scale(2.2) rotate(-12deg)", opacity: "0" },
          "60%": { transform: "scale(0.92) rotate(-3deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-3deg)", opacity: "1" },
        },
        "rise-in": {
          "0%": { transform: "translateY(24px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ball-bob": "ball-bob 2.4s ease-in-out infinite",
        "pop-in": "pop-in 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "slam-in": "slam-in 0.5s cubic-bezier(0.22, 1.4, 0.36, 1) both",
        "rise-in": "rise-in 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) both",
        wiggle: "wiggle 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
