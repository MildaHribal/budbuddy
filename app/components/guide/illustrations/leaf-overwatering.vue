<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafOverwatering')"
    where="all"
    :place="t('guideArt.place.all')"
    :tone="ART.water"
    droopy
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="ART.leafDeep"
      :fill-opacity="0.5"
      :stroke="ART.leaf"
      :droop="0.75"
      :plump="1.4"
      :spread="1.15"
    />
  </GuideArtLeafPlate>
</template>
