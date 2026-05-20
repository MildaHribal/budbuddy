// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@nuxtjs/ionic'
  ],

  ssr: false,

  devtools: {
    enabled: false
  },

  css: [
    '@ionic/vue/css/core.css',
    '@ionic/vue/css/structure.css',
    '@ionic/vue/css/typography.css',

    // You might also need these optional Ionic utilities
    '@ionic/vue/css/padding.css',
    '@ionic/vue/css/float-elements.css',
    '@ionic/vue/css/text-alignment.css',
    '@ionic/vue/css/text-transformation.css',
    '@ionic/vue/css/flex-utils.css',
    '@ionic/vue/css/display.css',

    '~/assets/css/main.css'
  ],

  runtimeConfig: {
    public: {
      // Absolute URL of the AI proxy function. Leave empty for web builds
      // (uses the relative /api/chat path); set NUXT_PUBLIC_AI_PROXY_URL to the
      // full Netlify function URL for the bundled Android APK.
      aiProxyUrl: ''
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  sourcemap: true,

  compatibilityDate: '2025-01-15',
  vite: {
    build: {
      sourcemap: true
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  ionic: {
    css: {
      core: false,
      basic: false,
      utilities: false
    }
  }
})
