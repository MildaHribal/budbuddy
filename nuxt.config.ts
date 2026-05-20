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
      // Absolute URL of the AI proxy function (Netlify). Used by the web build
      // and the bundled Android APK so the AI assistant works with no user
      // setup. Override with NUXT_PUBLIC_AI_PROXY_URL if the site moves.
      aiProxyUrl: 'https://budbuddy-demo.netlify.app/api/chat'
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
