<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafNitrogen')"
    where="old"
    :place="t('guideArt.place.old')"
    :tone="ART.yellow"
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="ART.yellow"
      :fill-opacity="0.5"
      :stroke="ART.yellow"
      :veins="ART.yellow"
      :vein-width="1.2"
    />
  </GuideArtLeafPlate>
</template>
