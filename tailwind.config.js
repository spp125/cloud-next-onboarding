/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  safelist: [
    // Modern light theme colors
    'from-emerald-50',
    'to-cyan-50',
    'from-emerald-500',
    'to-cyan-500',
    'bg-emerald-100',
    'bg-emerald-200/40',
    'text-emerald-700',
    'border-emerald-200',
    'border-emerald-300',
    'hover:border-emerald-300',
    'bg-white/60',
    'blur-3xl',
    'shadow-lg',
    'shadow-sm',
    'hover:shadow-md',
    'rounded-2xl',
    'rounded-xl',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
