import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "eu.budbuddy.app",
  appName: "BudBuddy",
  //webDir: ".output/public",
  //bundledWebRuntime: false,
  webDir: "dist",
  //webDir: ".output/public",
  server: {
    url: "http://192.168.1.196:3000",
    cleartext: true,
  },
  plugins: {}
}

export default config;
