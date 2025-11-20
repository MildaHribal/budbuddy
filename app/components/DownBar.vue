<script setup lang="ts">
import { ref } from 'vue'
import { homeOutline, leafOutline, addCircleOutline, calculatorOutline, menuOutline } from 'ionicons/icons'

const icons = {
  homeOutline,
  leafOutline,
  addCircleOutline,
  calculatorOutline,
  menuOutline
}
</script>

<template>
  <IonFooter class="downbar-ionic">
    <IonToolbar class="toolbar">
      <div class="row">
        <NuxtLink to="/" class="btn">
          <IonIcon :icon="icons.homeOutline" class="icon" />
        </NuxtLink>

        <NuxtLink to="/my-trees" class="btn">
          <IonIcon :icon="icons.leafOutline" class="icon" />
        </NuxtLink>

        <NuxtLink to="/" class="btn center-btn" aria-label="Přidat">
          <IonIcon :icon="icons.addCircleOutline" class="icon" />
        </NuxtLink>

        <NuxtLink to="/nutriens-calc" class="btn">
          <IonIcon :icon="icons.calculatorOutline" class="icon" />
        </NuxtLink>

        <USlideover>
          <template #trigger>
            <button class="hamburger" aria-label="Menu">
              <IonIcon :icon="icons.menuOutline" class="icon" />
            </button>
          </template>
          <template #body>
            <div class="menu-sheet">
              <ul>
                <li><NuxtLink to="/">Domů</NuxtLink></li>
                <li><NuxtLink to="/my-trees">Můj deník</NuxtLink></li>
                <li><NuxtLink to="/nutriens-calc">Kalkulačka</NuxtLink></li>
              </ul>
            </div>
          </template>
        </USlideover>
      </div>
    </IonToolbar>
  </IonFooter>
</template>

<style scoped>
.downbar-ionic {
  --ion-safe-area-bottom: env(safe-area-inset-bottom);
  background: linear-gradient(180deg,#04140c,#071a11);
  border-top: none;
}
.toolbar { padding: 0; }
.row {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: space-between;
  padding: calc(6px + var(--ion-safe-area-bottom)) 12px 8px 12px;
}
.btn {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #7bf2a4;
  padding: 6px;
  border-radius: 8px;
}
.center-btn { /* keep same size as others, no big green circle */ }
.icon {
  width: 28px;
  height: 28px;
  color: currentColor;
}
.hamburger {
  background: transparent;
  border: none;
  color: #7bf2a4;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}
.menu-sheet {
  background: #071a11;
  color: #e6fff0;
  padding: 12px;
  border-radius: 8px;
}
.menu-sheet ul { list-style: none; margin: 0; padding: 0; }
.menu-sheet li { padding: 8px 0; }
.menu-sheet a { color: #bff8d2; text-decoration: none; }

@media (min-width: 768px) {
  .downbar-ionic { display: none; }
}
</style>
