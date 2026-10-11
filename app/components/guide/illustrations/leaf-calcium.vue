<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafCalcium')"
    where="new"
    :place="t('guideArt.place.new')"
    :tone="ART.rust"
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="ART.leaf"
      :stroke="ART.leaf"
      :pattern="'spots'"
      :pattern-color="ART.burn"
      :amount="1.3"
      :wobble="0.14"
    />
  </GuideArtLeafPlate>
</template>
