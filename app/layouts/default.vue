<template>

  <div>
    <UHeader :ui="{
    right: 'hidden',
    left: 'flex gap-0'
  }">
      <template #left>
        <NuxtImg src="/icon.webp" class="h-full " height="30"/>

        <h1 class="text-xl">BudBuddy</h1>
      </template>
    </UHeader>
  </div>



  <div>
<slot/>
  </div>

  <div>
    <DownBar/>
  </div>

</template>


<script setup lang="ts">
</script>
