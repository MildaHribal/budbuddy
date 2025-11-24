<script setup lang="ts">
import { ref } from 'vue'
import DayPicker from "~/components/trees/DayPicker.vue";
import ActionBar from "~/components/trees/ActionBar.vue";
import Actions from "~/components/trees/journal/Actions.vue";

const selectedDate = ref(new Date().toISOString().slice(0, 10))

function onDateUpdate(newIso: string) {
  selectedDate.value = newIso
}
</script>

<template>
  <div class="block">
    <div>
      <DayPicker @update:date="onDateUpdate" />
    </div>
    <div>
      <ActionBar :date="selectedDate" />
    </div>

    <main>
      <Actions :date="selectedDate" />
    </main>
  </div>


</template>

<style scoped>

</style>
