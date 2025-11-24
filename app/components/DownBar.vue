<template>
  <ion-footer class="downbar-ionic">
    <ion-toolbar class="toolbar">
      <div class="row">
        <NuxtLink to="/" class="btn">
          <ion-icon :icon="icons.homeOutline" class="icon" />
        </NuxtLink>

        <NuxtLink to="/my-trees" class="btn">
          <ion-icon :icon="icons.leafOutline" class="icon" />
        </NuxtLink>

        <NuxtLink to="/" class="btn center-btn" aria-label="Přidat">
          <ion-icon :icon="icons.addCircleOutline" class="icon" />
        </NuxtLink>

        <NuxtLink to="/nutriens-calc" class="btn">
          <ion-icon :icon="icons.calculatorOutline" class="icon" />
        </NuxtLink>
      </div>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup lang="ts">
import { homeOutline, leafOutline, addCircleOutline, calculatorOutline, menuOutline } from 'ionicons/icons'

const icons = {
  homeOutline,
  leafOutline,
  addCircleOutline,
  calculatorOutline,
  menuOutline
}
</script>

<style scoped>


.row {
  display: flex;
  gap: 8px;
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
  color: var(--accent, #7bc74d);
  padding: 6px;
  border-radius: 8px;
}
.icon {
  width: 32px;
  height: 32px;
  color: currentColor;
}

ion-toolbar {
  --background: #202123;
}


@media (min-width: 768px) {
  .downbar-ionic { display: none; }
}
</style>

<style>
/* Globální pravidlo: skryje downbar při otevřeném modalu (třída přidána na body) */
body.downbar-hidden .downbar-ionic {
  transform: translateY(100%);
  transition: transform 0.18s ease;
  pointer-events: none;
  opacity: 0;
}

/* Zajistíme plynulý návrat, pokud třída bude odstraněna */
.downbar-ionic {
  transition: transform 0.18s ease, opacity 0.12s ease;
}
</style>
