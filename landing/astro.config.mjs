// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    // Without this Vite finds the Expo app's root tsconfig (extends expo/tsconfig.base), which isn't installed on Vercel.
    tsconfig: './tsconfig.json'
  }
});