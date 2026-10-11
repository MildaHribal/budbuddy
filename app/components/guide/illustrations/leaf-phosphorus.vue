<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafPhosphorus')"
    where="old"
    :place="t('guideArt.place.old')"
    :tone="ART.purple"
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="'#2e5a2c'"
      :fill-opacity="0.85"
      :stroke="'#7e9f62'"
      :veins="ART.magenta"
      :vein-width="1.4"
      :pattern="'patches'"
      pattern-color="#a8743f"
      :petiole="ART.magenta"
    />
  </GuideArtLeafPlate>
</template>
