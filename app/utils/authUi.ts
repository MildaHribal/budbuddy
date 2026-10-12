import { ref } from 'vue'

/** Set before a page outside the community routes asks for sign-in, so app.vue mounts the sign-in sheet. */
export const authUiWanted = ref(false)
