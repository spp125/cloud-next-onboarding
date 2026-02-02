/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  safelist: [
    'from-green-50',
    'to-emerald-50',
    'border-green-200',
    'border-green-300',
    'text-green-600',
    'bg-green-600',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
