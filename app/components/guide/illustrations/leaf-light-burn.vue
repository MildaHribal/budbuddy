<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafLightBurn')"
    where="top"
    :place="t('guideArt.place.top')"
    :tone="ART.pale"
    lamp
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="ART.pale"
      :fill-opacity="0.38"
      :stroke="ART.pale"
      :veins="'#c9de8a'"
      :vein-width="1.6"
      :pattern="'tips'"
      :pattern-color="'#fffbe8'"
      :amount="0.6"
    />
  </GuideArtLeafPlate>
</template>
