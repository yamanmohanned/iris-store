import containerQueries from '@tailwindcss/container-queries';
import forms from '@tailwindcss/forms';
import type { Config } from 'tailwindcss';
import { borderRadius, boxShadow, colors, fontFamily, fontSize, spacing } from './src/design/tokens';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      borderRadius,
      spacing,
      fontFamily,
      fontSize,
      boxShadow,
      // أدوات استخدمتها تصاميم Stitch (Tailwind 4) ولا توجد في Tailwind 3 — بدونها كانت تُتجاهل بصمت
      backdropBlur: { xs: '2px' },
      transitionDuration: { 400: '400ms' },
      inset: { '1/5': '20%' },
      backgroundImage: { radial: 'radial-gradient(var(--tw-gradient-stops))' },
    },
  },
  plugins: [
    // بعض شاشات Stitch استُخدمت مع forms plugin بشكل أساسي (base)؛ نفعّله بنمط class
    // ونُطبّق أنماطه الأساسية على الصفحات التي تحتاجه فقط (انظر styles/forms-base.css).
    forms({ strategy: 'class' }),
    containerQueries,
  ],
} satisfies Config;
