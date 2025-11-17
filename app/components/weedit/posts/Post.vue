<script setup lang="ts">
const authors = ref([
  {
    name: 'WEEDRapist69',
    avatar: {
      src: 'https://github.com/antfu.png'
    },
    to: 'https://google.com',
    target: '_blank'
  }
])
</script>

<template>
  <UBlogPost
    title="Cumte na ty kytky ty kokos"
    description="Kamo neuveris byl jsem v lese hulit a nasel jsem tohle lol xd"
    image="https://as2.ftcdn.net/jpg/02/19/68/17/1000_F_219681749_QT3OVP4p9lCMCYpYpLM56BF4oVkYATvQ.jpg"
    date="2024-11-25"
    :authors="authors"
  />
</template>
