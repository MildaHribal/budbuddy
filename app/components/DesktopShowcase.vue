<script setup lang="ts">
const { t } = useI18n()
const { state, preview } = useGrow()
const startOwnGarden = useOwnGarden()

const RELEASES = 'https://github.com/MildaHribal/budbuddy/releases/latest'
const FEATURES = [
  { key: 'journal', icon: 'photo' },
  { key: 'reminders', icon: 'water' },
  { key: 'environment', icon: 'measure' },
  { key: 'strains', icon: 'flowering' },
  { key: 'guide', icon: 'guide' },
  { key: 'ai', icon: 'spark' }
] as const
</script>

<template>
  <aside
    class="showcase"
    :aria-label="t('showcase.label')"
  >
    <div class="sc-brand">
      <img
        src="/icon.webp"
        alt=""
        width="44"
        height="44"
      >
      <span>BudBuddy</span>
    </div>

    <p class="sc-pitch">
      {{ t('showcase.pitch') }}
    </p>
    <p class="sc-lead">
      {{ t('showcase.lead') }}
    </p>

    <ul class="sc-features card">
      <li
        v-for="f in FEATURES"
        :key="f.key"
      >
        <span class="sc-tile"><GrowIcon :name="f.icon" /></span>
        <span class="sc-text">
          <strong>{{ t(`showcase.features.${f.key}.title`) }}</strong>
          <span>{{ t(`showcase.features.${f.key}.text`) }}</span>
        </span>
      </li>
    </ul>

    <div class="sc-cta">
      <a
        class="btn btn-primary"
        :href="RELEASES"
        target="_blank"
        rel="noopener"
      >
        <UIcon
          name="i-tabler-brand-android"
          class="size-5"
        />
        {{ t('showcase.download') }}
      </a>
      <span>{{ t('showcase.downloadHint') }}</span>
    </div>

    <p class="sc-hint">
      <UIcon
        name="i-tabler-pointer"
        class="size-4"
      />
      <span>
        {{ t('showcase.hint') }}
        <button
          v-if="state.settings.demo"
          type="button"
          class="sc-link"
          @click="startOwnGarden"
        >{{ t(preview ? 'showcase.own.saved' : 'showcase.own.action') }}</button>
      </span>
    </p>

    <footer class="sc-foot">
      <a href="/privacy.html">{{ t('showcase.privacy') }}</a>
      <span aria-hidden="true">·</span>
      <a href="/terms.html">{{ t('showcase.terms') }}</a>
    </footer>
  </aside>
</template>

<style scoped>
.showcase {
  width: 440px;
  flex-shrink: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sc-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.sc-brand img {
  border-radius: var(--radius-sm);
}

.sc-pitch {
  margin: 28px 0 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.sc-lead {
  margin: 10px 0 0;
  color: var(--text-2);
  max-width: 44ch;
  text-wrap: pretty;
}

.sc-features {
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.sc-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 14px;
}

.sc-features li + li {
  border-top: 1px solid var(--line);
}

.sc-tile {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--green);
}

.sc-tile :deep(svg) {
  width: 20px;
  height: 20px;
}

.sc-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sc-text strong {
  font-size: 15px;
  font-weight: 600;
}

.sc-text span {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-2);
}

.sc-cta {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.sc-cta > span {
  font-size: 13px;
  color: var(--text-3);
}

.sc-hint {
  margin: 16px 0 0;
  display: flex;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
}

.sc-hint > :first-child {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--green);
}

.sc-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--green);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}

.sc-foot {
  margin-top: 28px;
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--text-3);
}

.sc-foot a {
  color: var(--text-3);
  text-decoration: none;
}

@media (max-height: 820px) {
  .sc-pitch {
    margin-top: 20px;
  }

  .sc-features,
  .sc-cta {
    margin-top: 16px;
  }

  .sc-features li {
    min-height: 50px;
    padding: 6px 14px;
  }

  .sc-foot {
    margin-top: 16px;
  }
}

.sc-foot a:hover,
.sc-link:hover {
  color: var(--text);
}
</style>
