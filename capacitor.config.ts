import type { CapacitorConfig } from '@capacitor/cli'

// During development you can live-reload from a dev server by setting
// CAP_SERVER_URL, e.g. `CAP_SERVER_URL=http://192.168.1.196:3000 npx cap run android`.
// In production (the released APK) this MUST be unset so the app loads the
// bundled web build from `webDir` instead of a non-existent LAN dev server.
const devServerUrl = process.env.CAP_SERVER_URL

const config: CapacitorConfig = {
  appId: 'eu.budbuddy.app',
  appName: 'BudBuddy',
  webDir: 'dist',
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: true
        }
      }
    : {}),
  plugins: {}
}

export default config
