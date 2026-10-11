import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'eu.budbuddy.app',
  appName: 'BudBuddy',
  webDir: 'dist',
  backgroundColor: '#07080a',
  android: {
    // Android 15 draws apps edge-to-edge; keep the WebView clear of the system bars.
    adjustMarginsForEdgeToEdge: 'force'
  },
  plugins: {
    // Android shrinks the WebView above the keyboard, so pages need no layout tricks
    Keyboard: {
      resizeOnFullScreen: true
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_budbuddy',
      iconColor: '#9BE36B'
    }
  }
}

export default config
