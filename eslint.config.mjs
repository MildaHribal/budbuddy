// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  // "Header" is an intentional single-word app component name.
  files: ['app/components/Header.vue'],
  rules: {
    'vue/multi-word-component-names': 'off'
  }
})
