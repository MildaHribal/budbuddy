<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtLeafPlate
    :label="t('guideArt.leafPotassium')"
    where="old"
    :place="t('guideArt.place.old')"
    :tone="ART.rust"
  >
    <GuideArtFanLeaf
      :size="100"
      :fill="ART.leaf"
      :stroke="ART.leaf"
      :pattern="'edges'"
      :pattern-color="ART.burn"
      :halo="ART.yellow"
    />
  </GuideArtLeafPlate>
</template>
