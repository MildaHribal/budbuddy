<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafIron')"
    where="new"
    :place="t('guideArt.place.new')"
    :tone="ART.pale"
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="ART.pale"
      :fill-opacity="0.42"
      :stroke="ART.pale"
      :veins="ART.leaf"
      :vein-width="2.6"
    />
  </GuideArtLeafPlate>
</template>
