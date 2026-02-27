// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@vueuse/nuxt',
    "@nuxt/icon",
    "@nuxtjs/ionic",
  ],

  ssr: false,

  devtools: {
    enabled: false
  },

  css: [
    "@ionic/vue/css/core.css",
    "@ionic/vue/css/structure.css",
    "@ionic/vue/css/typography.css",

    // You might also need these optional Ionic utilities
    "@ionic/vue/css/padding.css",
    "@ionic/vue/css/float-elements.css",
    "@ionic/vue/css/text-alignment.css",
    "@ionic/vue/css/text-transformation.css",
    "@ionic/vue/css/flex-utils.css",
    "@ionic/vue/css/display.css",

    "~/assets/css/main.css",
  ],

  ionic: {
    css: {
      core: false,
      basic: false,
      utilities: false,
    },
  },

  routeRules: {
    '/': { prerender: true }
  },

  nitro: {
    preset: 'github-pages'
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

  sourcemap: true,
  vite: {
    build: {
      sourcemap: true
    }
  }
})
