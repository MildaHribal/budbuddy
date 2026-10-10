import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'eu.budbuddy.app',
  appName: 'BudBuddy',
  webDir: 'dist',
  backgroundColor: '#0a0a0a',
  android: {
    // Android 15 draws apps edge-to-edge; keep the WebView clear of the system bars.
    adjustMarginsForEdgeToEdge: 'force'
  }
}

export default config
