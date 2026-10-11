<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafHealthy')"
    where="all"
    :place="t('guideArt.place.all')"
    :tone="ART.leaf"
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="ART.leaf"
      :stroke="ART.leaf"
    />
  </GuideArtLeafPlate>
</template>
