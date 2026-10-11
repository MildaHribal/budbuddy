// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from './package.json'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt'],

  // Static SPA – runs as a website and inside the Capacitor Android shell.
  ssr: false,

  devtools: { enabled: false },

  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover'
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark',
    fallback: 'dark'
  },

  runtimeConfig: {
    public: {
      version: pkg.version,
      // Absolute so the APK reaches it too; override with NUXT_PUBLIC_AI_PROXY_URL.
      aiProxyUrl: 'https://budbuddy-demo.netlify.app/api/chat',
      // Optional, must match BUDBUDDY_APP_TOKEN on the server (NUXT_PUBLIC_AI_APP_TOKEN at build time).
      aiAppToken: ''
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    // Icons are bundled into the app so they work offline in the APK.
    provider: 'none',
    fallbackToApi: false,
    clientBundle: {
      scan: { globInclude: ['app/**/*.{vue,ts}'] },
      sizeLimitKb: 512
    }
  }
})
