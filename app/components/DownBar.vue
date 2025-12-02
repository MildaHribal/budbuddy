<template>
    <div class="downbar">
      <div class="row">
        <NuxtLink to="/" class="btn">
          <Icon icon="tabler:home"  height="30" />
        </NuxtLink>

        <NuxtLink to="/my-trees" class="btn">
          <Icon icon="tabler:leaf" height="30" />
        </NuxtLink>

        <NuxtLink to="/" class="btn center-btn" aria-label="Přidat">
          <Icon icon="tabler:line-scan" height="30" />
        </NuxtLink>

        <NuxtLink to="/nutriens-calc" class="btn">
          <Icon icon="solar:calculator-broken"  height="30" />
        </NuxtLink>
      </div>
    </div>
</template>

<script setup lang="ts">
import { homeOutline, leafOutline, addCircleOutline, calculatorOutline, menuOutline } from 'ionicons/icons'
import { Icon } from "@iconify/vue";

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

.downbar {
  background-color: #202123;
}


</style>

<style>
body.downbar-hidden .downbar-ionic {
  transform: translateY(100%);
  transition: transform 0.18s ease;
  pointer-events: none;
  opacity: 0;
}

</style>
