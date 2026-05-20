<div align="center">

# 🌱 BudBuddy

### Your friendly cannabis grow tracker & AI assistant 🌿

[![Deploy](https://img.shields.io/badge/web-budbuddy.hribal.site-3fae46?style=flat-square&logo=netlify&logoColor=white)](https://budbuddy.hribal.site)
[![Android APK](https://img.shields.io/badge/Android-Download%20APK-1f7a33?style=flat-square&logo=android&logoColor=white)](https://github.com/MildaHribal/budbuddy/releases/latest)
[![Built with Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?style=flat-square&logo=nuxtdotjs&logoColor=white)](https://nuxt.com)
[![Ionic](https://img.shields.io/badge/Ionic-Vue-3880FF?style=flat-square&logo=ionic&logoColor=white)](https://ionicframework.com)

</div>

---

## ✨ What is BudBuddy?

**BudBuddy** is a mobile-first app that helps home growers track their plants from seed to harvest. Log daily tasks, follow each plant through every growth stage, crunch the numbers, and get help from a built-in **AI assistant** that knows its way around cultivation. 🪴

It runs on the **web** and ships as a native **Android app** (built with Capacitor).

## 🚀 Features

- 📊 **Dashboard** — today's tasks, quick stats and an at-a-glance view of every plant.
- 🌿 **My Plants** — a journal per plant: stages, watering, feeding, notes and photos.
- 🌡️ **Growth timeline & stages** — germination → seedling → vegetative → flowering → harvest.
- 🖼️ **Gallery** — every photo from your grow journals in one place.
- 📈 **Stats** — progress, achievements and grow insights.
- 🤖 **AI Assistant** — chat about deficiencies, pH, training and more, with optional **photo diagnosis**.
- 💾 **Offline-first** — data is stored on-device (Capacitor Preferences), no account needed.

## 🤖 The AI Assistant

The assistant is powered by **Google Gemini**, which has a generous **free tier**.

1. Open the **AI Assistant** tab and tap the ⚙️ icon.
2. Grab a free API key at **[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)**.
3. Paste it and hit **Save** — the key is stored only on your device.

With a key you get smart, photo-aware advice. Without one, the assistant still answers from a built-in offline guide. 🌱

## 📱 Get the app

| Platform | Link |
|----------|------|
| 🌐 Web   | **[budbuddy.hribal.site](https://budbuddy.hribal.site)** |
| 🤖 Android (APK) | **[Latest release](https://github.com/MildaHribal/budbuddy/releases/latest)** → download `BudBuddy-*.apk` |

> 📦 Every CI build publishes an installable **`.apk`** on the Releases page.

## 🛠️ Tech stack

- ⚡ **[Nuxt 4](https://nuxt.com)** (SSR off — fully static)
- 💙 **[Ionic Vue](https://ionicframework.com)** + **[Vue 3](https://vuejs.org)**
- 📱 **[Capacitor](https://capacitorjs.com)** for the native Android build
- 🎨 **[Nuxt UI](https://ui.nuxt.com)** & **[Iconify](https://iconify.design)**
- 🧠 **[Google Gemini API](https://ai.google.dev)** for the AI assistant

## 💻 Development

```bash
# install dependencies
npm install

# start the dev server (http://localhost:3000)
npm run dev

# lint & type-check
npm run lint
npm run typecheck

# build the static web app (outputs to dist/)
npm run generate
```

### 📲 Run on Android

```bash
# build the web assets, then sync to the native project
npm run generate
npx cap sync android

# open in Android Studio
npx cap open android
```

> 💡 For live-reload on a device, point Capacitor at your dev server:
> `CAP_SERVER_URL=http://<your-lan-ip>:3000 npx cap run android`.
> Leave `CAP_SERVER_URL` **unset** for production builds so the APK loads the bundled web app.

## ⚠️ Disclaimer

BudBuddy is a gardening companion app. Always follow the **cannabis laws and regulations of your own country or region**. 🌍

---

<div align="center">

Made with 🌿 &nbsp;•&nbsp; Happy growing!

</div>
