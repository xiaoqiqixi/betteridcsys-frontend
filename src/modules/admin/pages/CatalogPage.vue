<script setup lang="ts">
import { ChevronRight, Plus, Trash2 } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import type { CatalogTaxonomy } from '@/contract/site'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import { COUNTRIES, countryName } from '@/shared/lib/countries'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import LocalizedInput from '../components/LocalizedInput.vue'

const { t, locale } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const session = useSession()
const tab = ref<'taxonomy' | 'images'>('taxonomy')
const taxonomy = useApiQuery(api.admin.taxonomy)
const draft = ref<CatalogTaxonomy | null>(null)
watch(
  () => taxonomy.data.value,
  (v) => v && (draft.value = JSON.parse(JSON.stringify(v))),
  { immediate: true },
)
const dirty = computed(
  () => !!draft.value && JSON.stringify(draft.value) !== JSON.stringify(taxonomy.data.value),
)
const selected = ref<{ kind: 'type' | 'region' | 'node'; id: string } | null>(null)
const tmpId = () => `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
function addType() {
  const id = tmpId()
  draft.value!.types.push({
    id,
    slug: `type-${draft.value!.types.length + 1}`,
    name: { 'zh-CN': '新分类', en: 'New category' },
    icon: 'cloud',
    sort_order: 100,
    visible: false,
  })
  selected.value = { kind: 'type', id }
}
function addRegion(type_id: string) {
  const id = tmpId()
  draft.value!.regions.push({
    id,
    type_id,
    name: { 'zh-CN': '新地区', en: 'New region' },
    country: 'US',
    city: '',
    sort_order: 100,
    visible: false,
  })
  selected.value = { kind: 'region', id }
}
function addNode(region_id: string) {
  const id = tmpId()
  draft.value!.nodes.push({
    id,
    region_id,
    name: { 'zh-CN': '新线路', en: 'New line' },
    network_label: '',
    test_ip: '',
    sort_order: 100,
    visible: false,
  })
  selected.value = { kind: 'node', id }
}
function remove() {
  const s = selected.value
  const d = draft.value
  if (!s || !d) return
  if (s.kind === 'type') {
    const regions = d.regions.filter((r) => r.type_id === s.id).map((r) => r.id)
    d.nodes = d.nodes.filter((n) => !regions.includes(n.region_id))
    d.regions = d.regions.filter((r) => r.type_id !== s.id)
    d.types = d.types.filter((x) => x.id !== s.id)
  } else if (s.kind === 'region') {
    d.nodes = d.nodes.filter((n) => n.region_id !== s.id)
    d.regions = d.regions.filter((r) => r.id !== s.id)
  } else d.nodes = d.nodes.filter((n) => n.id !== s.id)
  selected.value = null
}
const current = computed(() => {
  const s = selected.value
  const d = draft.value
  if (!s || !d) return null
  return s.kind === 'type'
    ? d.types.find((x) => x.id === s.id)
    : s.kind === 'region'
      ? d.regions.find((x) => x.id === s.id)
      : d.nodes.find((x) => x.id === s.id)
})
const save = useApiMutation(api.admin.updateTaxonomy, {
  invalidates: [api.admin.taxonomy, api.site.taxonomy],
  onSuccess: () => toast.success(t('common.saved')),
})
const countries = computed(() =>
  COUNTRIES.map((c) => ({ value: c, label: countryName(c, locale.value) })).sort((a, b) =>
    a.label.localeCompare(b.label, locale.value),
  ),
)

const images = useApiQuery(api.admin.osImages, () => (tab.value === 'images' ? {} : null))
const patchImage = useApiMutation(api.admin.updateOsImage, { invalidates: [api.admin.osImages] })
const canWrite = computed(() => session.can('products.write'))
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.catalog')" :description="$t('admin.catalog.subtitle')">
      <template #actions>
        <UiButton
          v-if="tab === 'taxonomy' && canWrite"
          variant="primary"
          :disabled="!dirty"
          :loading="save.isPending.value"
          @click="draft && save.mutate({ body: draft }, { onError: (e) => toast.error(errors.text(e)) })"
          >{{ $t('common.save') }}</UiButton
        >
      </template>
    </UiPageHeader>
    <div class="mb-4">
      <UiSegmented
        v-model="tab"
        :options="[
          { value: 'taxonomy', label: $t('admin.catalog.taxonomy') },
          { value: 'images', label: $t('admin.catalog.images') },
        ]"
      />
    </div>

    <template v-if="tab === 'taxonomy'">
      <UiErrorState v-if="taxonomy.isError.value" :error="taxonomy.error.value" @retry="taxonomy.refetch()" />
      <UiSkeleton v-else-if="!draft" :lines="8" />
      <div v-else class="grid gap-6 lg:grid-cols-[1fr_380px]">
        <UiCard :padded="false">
          <ul class="divide-y divide-line">
            <li
              v-for="ty in [...draft.types].sort((a, b) => a.sort_order - b.sort_order)"
              :key="ty.id"
              class="py-2"
            >
              <button
                :class="[
                  'flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm font-semibold',
                  selected?.id === ty.id ? 'text-primary' : 'text-fg hover:text-primary',
                ]"
                @click="selected = { kind: 'type', id: ty.id }"
              >
                {{ f.text(ty.name)
                }}<span v-if="!ty.visible" class="text-xs font-normal text-faint"
                  >({{ $t('admin.product.visibility.hidden') }})</span
                >
              </button>
              <ul class="ml-4 border-l border-line">
                <li v-for="r in draft.regions.filter((x) => x.type_id === ty.id)" :key="r.id">
                  <button
                    :class="[
                      'flex w-full items-center gap-1.5 px-4 py-1 text-left text-[13px]',
                      selected?.id === r.id ? 'text-primary' : 'text-fg-2 hover:text-primary',
                    ]"
                    @click="selected = { kind: 'region', id: r.id }"
                  >
                    <ChevronRight class="size-3 text-faint" />{{ f.text(r.name)
                    }}<span class="text-xs text-faint">{{ r.country }}</span>
                  </button>
                  <ul class="ml-8">
                    <li v-for="n in draft.nodes.filter((x) => x.region_id === r.id)" :key="n.id">
                      <button
                        :class="[
                          'w-full px-4 py-0.5 text-left text-xs',
                          selected?.id === n.id ? 'text-primary' : 'text-muted hover:text-primary',
                        ]"
                        @click="selected = { kind: 'node', id: n.id }"
                      >
                        {{ n.network_label || f.text(n.name) }}
                      </button>
                    </li>
                    <li v-if="canWrite">
                      <button
                        class="px-4 py-0.5 text-xs text-faint hover:text-primary"
                        @click="addNode(r.id)"
                      >
                        + {{ $t('admin.catalog.addNode') }}
                      </button>
                    </li>
                  </ul>
                </li>
                <li v-if="canWrite">
                  <button class="px-4 py-1 text-xs text-faint hover:text-primary" @click="addRegion(ty.id)">
                    + {{ $t('admin.catalog.addRegion') }}
                  </button>
                </li>
              </ul>
            </li>
          </ul>
          <template v-if="canWrite" #footer
            ><UiButton size="sm" @click="addType"
              ><Plus class="size-3.5" />{{ $t('admin.catalog.addType') }}</UiButton
            ></template
          >
        </UiCard>

        <UiCard
          :title="current ? $t(`admin.catalog.kind.${selected!.kind}`) : $t('admin.catalog.selectHint')"
        >
          <fieldset v-if="current && selected" :disabled="!canWrite" class="flex flex-col gap-4">
            <UiField :label="$t('admin.product.name')"
              ><template #default="{ id }"
                ><LocalizedInput :id="id" v-model="current.name" :maxlength="80" /></template
            ></UiField>
            <template v-if="selected.kind === 'type' && 'slug' in current">
              <UiField :label="$t('admin.product.slug')"
                ><template #default="{ id }"><UiInput :id="id" v-model="current.slug" mono /></template
              ></UiField>
              <UiField :label="$t('admin.catalog.icon')"
                ><template #default="{ id }"
                  ><UiSelect
                    :id="id"
                    v-model="current.icon"
                    :options="
                      (['cloud', 'zap', 'server', 'globe', 'cpu', 'shield'] as const).map((i) => ({
                        value: i,
                        label: i,
                      }))
                    " /></template
              ></UiField>
            </template>
            <template v-if="selected.kind === 'region' && 'country' in current">
              <UiField :label="$t('auth.country')"
                ><template #default="{ id }"
                  ><UiSelect :id="id" v-model="current.country" :options="countries" /></template
              ></UiField>
              <UiField :label="$t('account.city')"
                ><template #default="{ id }"><UiInput :id="id" v-model="current.city" /></template
              ></UiField>
            </template>
            <template v-if="selected.kind === 'node' && 'network_label' in current">
              <UiField :label="$t('admin.catalog.networkLabel')" :hint="$t('admin.catalog.networkLabelHint')"
                ><template #default="{ id }"><UiInput :id="id" v-model="current.network_label" /></template
              ></UiField>
              <UiField :label="$t('admin.catalog.testIp')"
                ><template #default="{ id }"><UiInput :id="id" v-model="current.test_ip" mono /></template
              ></UiField>
            </template>
            <UiField :label="$t('admin.product.sortOrder')"
              ><template #default="{ id }"
                ><UiInput :id="id" v-model.number="current.sort_order" type="number" /></template
            ></UiField>
            <UiSwitch v-model="current.visible" :label="$t('admin.catalog.visible')" />
            <UiButton variant="danger-ghost" @click="remove"
              ><Trash2 class="size-3.5" />{{ $t('common.delete') }}</UiButton
            >
          </fieldset>
          <p v-else class="text-[13px] text-muted">{{ $t('admin.catalog.selectBody') }}</p>
        </UiCard>
      </div>
    </template>

    <div v-else class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="images.isError.value" :error="images.error.value" @retry="images.refetch()" />
      <div v-else-if="!images.data.value" class="p-5"><UiSkeleton :lines="5" /></div>
      <p v-else-if="!images.data.value.length" class="px-5 py-10 text-center text-[13px] text-muted">
        {{ $t('admin.catalog.noImages') }}
      </p>
      <ul v-else class="divide-y divide-line">
        <li
          v-for="img in images.data.value"
          :key="img.id"
          class="flex flex-wrap items-center gap-3 px-5 py-3"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">{{ img.name }} {{ img.version }}</p>
            <p class="truncate font-mono text-xs text-muted">
              {{ img.controller_id }} · {{ img.remote_image_id }} · sha256:{{ img.sha256.slice(0, 12) }}
            </p>
          </div>
          <span class="text-xs text-muted">≥ {{ img.min_disk_gb }} GB</span>
          <UiSwitch
            :model-value="img.enabled"
            :disabled="!canWrite || patchImage.isPending.value"
            @update:model-value="
              (v: boolean) =>
                patchImage.mutate(
                  { params: { id: img.id }, body: { enabled: v } },
                  { onError: (e) => toast.error(errors.text(e)) },
                )
            "
          />
        </li>
      </ul>
    </div>
  </div>
</template>
