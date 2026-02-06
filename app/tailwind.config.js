module.exports = {
    content: [
        './client/**/*.{js,jsx,ts,tsx,html}',
        './imports/**/*.{js,jsx,ts,tsx,html}',
        "./.storybook/**/*.{js,jsx,ts,tsx,html}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    green: '#5fc86f',
                    'green-dark': '#096817',
                },
                surface: {
                    DEFAULT: '#f0efef',
                },
            },
            fontFamily: {
                mono: ['"DM Mono"', 'monospace'],
            },
        },
    },
    plugins: [],
}