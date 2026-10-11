<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafZinc')"
    where="new"
    :place="t('guideArt.place.new')"
    :tone="ART.yellow"
  >
    <GuideArtFanLeaf
      :fill="ART.yellow"
      :fill-opacity="0.4"
      :stroke="ART.yellow"
      :veins="ART.leaf"
      :vein-width="2.2"
      :size="74"
      :plump="0.75"
      :wobble="0.22"
      :spread="0.85"
    />
  </GuideArtLeafPlate>
</template>
