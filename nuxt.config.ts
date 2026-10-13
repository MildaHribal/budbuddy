// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from './package.json'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt'],

  // Static SPA – runs as a website and inside the Capacitor Android shell.
  ssr: false,

  devtools: { enabled: false },

  app: {
    // Static so link previews work without running the SPA.
    head: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      title: 'BudBuddy – free grow journal for home growers',
      meta: [
        { name: 'description', content: 'Free grow journal for home growers: log watering, feeding, training and photos from seed to jar, with reminders that follow your light schedule, a strain catalogue and a 58-lesson grow guide.' },
        { name: 'theme-color', content: '#0e100f' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'BudBuddy' },
        { property: 'og:url', content: 'https://budbuddy.hribal.site/' },
        { property: 'og:title', content: 'BudBuddy – free grow journal for home growers' },
        { property: 'og:description', content: 'Track every plant from seed to jar. Try the live demo garden in your browser or get the Android app.' },
        { property: 'og:image', content: 'https://budbuddy.hribal.site/icon.png' },
        { property: 'og:image:width', content: '512' },
        { property: 'og:image:height', content: '512' },
        { property: 'og:image:alt', content: 'BudBuddy app icon' },
        { name: 'twitter:card', content: 'summary' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'icon', type: 'image/webp', href: '/icon.webp' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
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
      aiAppToken: '',
      // Public by design (RLS protects the data); override with NUXT_PUBLIC_SUPABASE_*.
      supabaseUrl: 'https://mlvpmiwvuxgwjssrtxsq.supabase.co',
      supabaseKey: 'sb_publishable_6oTNsmVMqUCQg4BSYXROYQ_vK8kfUo1'
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
