<script setup lang="ts">
import { computed, watch } from 'vue'
import type { OsImage } from '@/contract/commerce'
import UiSelect from '@/shared/ui/UiSelect.vue'

const model = defineModel<string | undefined>()
const props = defineProps<{ images: OsImage[] }>()

const LABEL: Record<OsImage['family'], string> = {
  ubuntu: 'Ubuntu',
  debian: 'Debian',
  centos: 'CentOS',
  rocky: 'Rocky Linux',
  alma: 'AlmaLinux',
  fedora: 'Fedora',
  windows: 'Windows',
  alpine: 'Alpine',
  arch: 'Arch Linux',
  other: 'Other',
}
const HUE: Record<OsImage['family'], string> = {
  ubuntu: '#e95420',
  debian: '#d70a53',
  centos: '#932279',
  rocky: '#10b981',
  alma: '#0f4266',
  fedora: '#294172',
  windows: '#0078d4',
  alpine: '#0d597f',
  arch: '#1793d1',
  other: '#6b7280',
}
const families = computed(() => {
  const seen = new Map<OsImage['family'], OsImage[]>()
  for (const img of props.images) seen.set(img.family, [...(seen.get(img.family) ?? []), img])
  return [...seen.entries()].map(([family, list]) => ({
    family,
    list: [...list].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true })),
  }))
})
const current = computed(() => props.images.find((i) => i.id === model.value))
const family = computed(() => current.value?.family ?? families.value[0]?.family)
watch(
  families,
  (f) => {
    if (!current.value && f[0]) model.value = f[0].list[0]?.id
  },
  { immediate: true },
)
function chooseFamily(f: OsImage['family']) {
  model.value = families.value.find((x) => x.family === f)?.list[0]?.id
}
const versions = computed(
  () =>
    families.value
      .find((x) => x.family === family.value)
      ?.list.map((i) => ({ value: i.id, label: `${i.name} ${i.version}` })) ?? [],
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
      <button
        v-for="f in families"
        :key="f.family"
        type="button"
        role="radio"
        :aria-checked="family === f.family"
        :class="[
          'flex h-14 items-center gap-2.5 rounded-lg border px-3 text-left transition-colors',
          family === f.family
            ? 'border-primary bg-primary-soft ring-1 ring-primary'
            : 'border-line bg-surface hover:border-line-strong',
        ]"
        @click="chooseFamily(f.family)"
      >
        <span
          class="grid size-7 shrink-0 place-items-center rounded-md text-[11px] font-bold text-white"
          :style="{ background: HUE[f.family] }"
        >
          {{ LABEL[f.family].slice(0, 1) }}
        </span>
        <span class="truncate text-[13px] font-medium text-fg">{{ LABEL[f.family] }}</span>
      </button>
    </div>
    <UiSelect v-if="versions.length > 1" v-model="model" :options="versions" />
  </div>
</template>
