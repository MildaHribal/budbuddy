<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafSulfur')"
    where="new"
    :place="t('guideArt.place.new')"
    :tone="ART.lime"
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="ART.lime"
      :fill-opacity="0.4"
      :stroke="ART.lime"
      :veins="ART.lime"
      :vein-width="1.2"
    />
  </GuideArtLeafPlate>
</template>
