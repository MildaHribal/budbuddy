<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafNutrientBurn')"
    where="all"
    :place="t('guideArt.place.tips')"
    :tone="ART.rust"
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="ART.leafDeep"
      :fill-opacity="0.45"
      :stroke="ART.leaf"
      :pattern="'tips'"
      :pattern-color="ART.burn"
      :halo="ART.yellow"
      :amount="1.15"
    />
  </GuideArtLeafPlate>
</template>
