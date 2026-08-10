/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                primary: {
                    DEFAULT: "var(--c-primary)",
                    foreground: "var(--c-primary-foreground)",
                },
                white: "var(--c-white)",
                slate: {
                    50: "var(--c-slate-50)",
                    100: "var(--c-slate-100)",
                    200: "var(--c-slate-200)",
                    300: "var(--c-slate-300)",
                    400: "var(--c-slate-400)",
                    500: "var(--c-slate-500)",
                    600: "var(--c-slate-600)",
                    700: "var(--c-slate-700)",
                    800: "var(--c-slate-800)",
                    900: "var(--c-slate-900)",
                },
                background: "var(--c-bg)",
                foreground: "var(--c-foreground)",
                card: {
                    DEFAULT: "var(--c-card)",
                    foreground: "var(--c-foreground)",
                },
                muted: {
                    DEFAULT: "var(--c-muted)",
                    foreground: "var(--c-muted-foreground)",
                },
                border: "var(--c-border)",
                input: "var(--c-border)",
                ring: "var(--c-primary)",
                destructive: {
                    DEFAULT: "#ef4444",
                    foreground: "#fef2f2",
                },
                accent: {
                    DEFAULT: "var(--c-accent)",
                    foreground: "var(--c-accent-foreground)",
                },
            },
            borderRadius: {
                DEFAULT: "0.5rem",
                lg: "1rem",
                xl: "1.5rem",
                "2xl": "2rem",
                full: "9999px",
            },
            fontFamily: {
                display: ["Lexend", "sans-serif"],
                sans: ["Lexend", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
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
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}
