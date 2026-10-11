<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafMagnesium')"
    where="old"
    :place="t('guideArt.place.old')"
    :tone="ART.yellow"
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="ART.yellow"
      :fill-opacity="0.42"
      :stroke="ART.yellow"
      :veins="ART.leaf"
      :vein-width="3.4"
    />
  </GuideArtLeafPlate>
</template>
