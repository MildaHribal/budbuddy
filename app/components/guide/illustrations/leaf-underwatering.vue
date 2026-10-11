<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafUnderwatering')"
    where="all"
    :place="t('guideArt.place.all')"
    tone="#c2c98f"
    droopy
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="'#b9c27e'"
      :fill-opacity="0.16"
      :stroke="'#b9c48a'"
      :droop="1.0"
      :plump="0.7"
      :spread="0.9"
    />
  </GuideArtLeafPlate>
</template>
