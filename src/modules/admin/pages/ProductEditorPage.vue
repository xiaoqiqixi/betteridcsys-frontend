<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/contract/admin-endpoints'
import type { ProductUpsert } from '@/contract/admin'
import type { ProductOption } from '@/contract/commerce'
import { isApiError } from '@/shared/api'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiCheckbox from '@/shared/ui/UiCheckbox.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import LocalizedInput from '../components/LocalizedInput.vue'
import PriceMatrix from '../components/PriceMatrix.vue'
import ProductProvisioning from '../components/ProductProvisioning.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const session = useSession()
const isNew = computed(() => route.name === 'admin-product-new')
const product = useApiQuery(api.admin.product, () =>
  isNew.value ? null : { params: { id: String(route.params.id) } },
)
const taxonomy = useApiQuery(api.admin.taxonomy)
const currencies = useApiQuery(api.site.currencies)
const images = useApiQuery(api.admin.osImages)
const provisioning = ref<InstanceType<typeof ProductProvisioning>>()
const readOnly = computed(() => !session.can('products.write'))

const blank = (): ProductUpsert => ({
  slug: '',
  kind: 'cloud_server',
  node_id: '',
  name: { 'zh-CN': '', en: '' },
  description: { 'zh-CN': '', en: '' },
  badges: [],
  specs: {
    cpu_cores: 1,
    memory_mb: 1024,
    disk_gb: 20,
    bandwidth_mbps: 100,
    traffic_gb: 1000,
    ipv4: 1,
    ipv6: true,
  },
  prices: [],
  options: [],
  os_image_ids: [],
  stock: null,
  visibility: 'hidden',
  module: null,
  sort_order: 100,
})
const form = reactive<ProductUpsert>(blank())
watch(
  () => product.data.value,
  (p) => {
    if (!p) return
    Object.assign(form, {
      revision: p.revision,
      slug: p.slug,
      kind: p.kind,
      node_id: p.node_id,
      name: { ...p.name },
      description: { ...p.description },
      badges: [...p.badges],
      specs: { ...p.specs },
      prices: p.prices.map((x) => ({ ...x })),
      options: JSON.parse(JSON.stringify(p.options)) as ProductOption[],
      os_image_ids: p.os_images.map((i) => i.id),
      stock: p.stock,
      visibility: p.visibility,
      module: p.module
        ? {
            module_id: p.module.module_id,
            connection_id: p.module.connection_id,
            config: { ...p.module.config },
          }
        : null,
      sort_order: p.sort_order,
    })
  },
  { immediate: true },
)
const nodeOptions = computed(() => {
  const tx = taxonomy.data.value
  if (!tx) return []
  return tx.nodes.map((n) => {
    const r = tx.regions.find((x) => x.id === n.region_id)
    const ty = tx.types.find((x) => x.id === r?.type_id)
    return {
      value: n.id,
      label: `${f.text(ty?.name)} / ${f.text(r?.name)} / ${n.network_label || f.text(n.name)}`,
    }
  })
})
const stockUnlimited = computed({ get: () => form.stock === null, set: (v) => (form.stock = v ? null : 0) })
const trafficUnmetered = computed({
  get: () => form.specs.traffic_gb === null,
  set: (v) => (form.specs.traffic_gb = v ? null : 1000),
})
const BADGES = ['new', 'hot', 'limited', 'best_value'] as const
function toggleBadge(b: (typeof BADGES)[number], on: boolean) {
  form.badges = on ? [...form.badges, b] : form.badges.filter((x) => x !== b)
}
function toggleImage(id: string, on: boolean) {
  form.os_image_ids = on ? [...form.os_image_ids, id] : form.os_image_ids.filter((x) => x !== id)
}
let seq = 0
function addOption(kind: 'select' | 'quantity') {
  const key = `option_${form.options.length + 1}`
  form.options.push({
    id: `new-${Date.now()}-${seq++}`,
    key,
    kind,
    label: { 'zh-CN': '', en: '' },
    required: kind === 'select',
    choices: kind === 'select' ? [{ id: `new-c-${seq++}`, label: { 'zh-CN': '', en: '' }, prices: [] }] : [],
    ...(kind === 'quantity' ? { min: 0, max: 4, unit_prices: [] } : {}),
  })
}
const saveError = ref<string | null>(null)
const opts = {
  invalidates: [api.admin.products, api.admin.product, api.site.products],
  onSuccess: async (p: { id: string }) => {
    toast.success(t('common.saved'))
    if (isNew.value) await router.replace({ name: 'admin-product', params: { id: p.id } })
  },
}
const create = useApiMutation(api.admin.createProduct, opts)
const update = useApiMutation(api.admin.updateProduct, opts)
const pending = computed(() => create.isPending.value || update.isPending.value)
function save() {
  if (provisioning.value && !provisioning.value.validate()) return
  saveError.value = null
  const body = JSON.parse(JSON.stringify(form)) as ProductUpsert
  const onError = (e: unknown) =>
    (saveError.value =
      isApiError(e) && e.code === 'REVISION_CONFLICT' ? t('errors.REVISION_CONFLICT') : errors.text(e))
  if (isNew.value) create.mutate({ body }, { onError })
  else update.mutate({ params: { id: String(route.params.id) }, body }, { onError })
}
const allCurrencies = computed(() => currencies.data.value?.currencies ?? [])
</script>

<template>
  <div>
    <UiPageHeader
      :title="isNew ? $t('admin.product.create') : f.text(form.name) || $t('admin.nav.products')"
      back="/admin/products"
      :back-label="$t('admin.nav.products')"
    >
      <template #actions
        ><UiButton v-if="!readOnly" variant="primary" :loading="pending" @click="save">{{
          $t('common.save')
        }}</UiButton></template
      >
    </UiPageHeader>
    <UiErrorState v-if="product.isError.value" :error="product.error.value" @retry="product.refetch()" />
    <UiSkeleton v-else-if="!isNew && !product.data.value" :lines="10" />
    <fieldset v-else :disabled="readOnly" class="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div class="flex min-w-0 flex-col gap-6">
        <UiCard :title="$t('admin.product.basics')">
          <div class="grid gap-4 sm:grid-cols-2">
            <UiField :label="$t('admin.product.name')" class="sm:col-span-2"
              ><template #default="{ id }"
                ><LocalizedInput :id="id" v-model="form.name" :maxlength="120" /></template
            ></UiField>
            <UiField :label="$t('admin.product.description')" class="sm:col-span-2"
              ><template #default="{ id }"
                ><LocalizedInput :id="id" v-model="form.description" multiline :maxlength="2000" /></template
            ></UiField>
            <UiField :label="$t('admin.product.slug')" :hint="$t('admin.product.slugHint')"
              ><template #default="{ id }"><UiInput :id="id" v-model="form.slug" mono /></template
            ></UiField>
            <UiField :label="$t('admin.product.kind')">
              <template #default="{ id }"
                ><UiSelect
                  :id="id"
                  v-model="form.kind"
                  :options="
                    (['cloud_server', 'dedicated_server', 'generic'] as const).map((k) => ({
                      value: k,
                      label: $t(`admin.product.kinds.${k}`),
                    }))
                  "
              /></template>
            </UiField>
            <UiField :label="$t('admin.product.location')" class="sm:col-span-2"
              ><template #default="{ id }"
                ><UiSelect :id="id" v-model="form.node_id" :options="nodeOptions" /></template
            ></UiField>
          </div>
        </UiCard>

        <UiCard :title="$t('admin.product.specs')">
          <div class="grid gap-4 sm:grid-cols-3">
            <UiField label="vCPU"
              ><template #default="{ id }"
                ><UiInput :id="id" v-model.number="form.specs.cpu_cores" type="number" min="1" /></template
            ></UiField>
            <UiField :label="$t('admin.product.memoryMb')"
              ><template #default="{ id }"
                ><UiInput
                  :id="id"
                  v-model.number="form.specs.memory_mb"
                  type="number"
                  min="128"
                  step="128" /></template
            ></UiField>
            <UiField :label="$t('admin.product.diskGb')"
              ><template #default="{ id }"
                ><UiInput :id="id" v-model.number="form.specs.disk_gb" type="number" min="1" /></template
            ></UiField>
            <UiField :label="$t('admin.product.bandwidthMbps')"
              ><template #default="{ id }"
                ><UiInput
                  :id="id"
                  v-model.number="form.specs.bandwidth_mbps"
                  type="number"
                  min="1" /></template
            ></UiField>
            <UiField :label="$t('admin.product.trafficGb')">
              <template #default="{ id }">
                <div class="flex flex-col gap-2">
                  <UiInput
                    v-if="form.specs.traffic_gb !== null"
                    :id="id"
                    v-model.number="form.specs.traffic_gb"
                    type="number"
                    min="1"
                  />
                  <UiCheckbox v-model="trafficUnmetered" :label="$t('specs.unmetered')" />
                </div>
              </template>
            </UiField>
            <UiField label="IPv4"
              ><template #default="{ id }"
                ><UiInput :id="id" v-model.number="form.specs.ipv4" type="number" min="0" /></template
            ></UiField>
            <div class="sm:col-span-3"><UiSwitch v-model="form.specs.ipv6" label="IPv6" /></div>
          </div>
        </UiCard>

        <UiCard :title="$t('admin.product.pricing')" :description="$t('admin.product.pricingHint')">
          <PriceMatrix v-model="form.prices" :currencies="allCurrencies" />
        </UiCard>

        <UiCard :title="$t('configure.options')" :description="$t('admin.product.optionsHint')">
          <div class="flex flex-col gap-4">
            <div v-for="(o, oi) in form.options" :key="o.id" class="rounded-lg border border-line p-4">
              <div class="flex items-start gap-3">
                <div class="grid flex-1 gap-3 sm:grid-cols-2">
                  <UiField :label="$t('admin.product.optionLabel')"
                    ><template #default="{ id }"
                      ><LocalizedInput :id="id" v-model="o.label" :maxlength="80" /></template
                  ></UiField>
                  <UiField :label="$t('admin.product.optionKey')"
                    ><template #default="{ id }"><UiInput :id="id" v-model="o.key" mono /></template
                  ></UiField>
                </div>
                <UiButton
                  square
                  variant="danger-ghost"
                  :aria-label="$t('common.remove')"
                  @click="form.options.splice(oi, 1)"
                  ><Trash2 class="size-3.5"
                /></UiButton>
              </div>
              <template v-if="o.kind === 'select'">
                <UiCheckbox v-model="o.required" :label="$t('admin.product.required')" class="mt-3" />
                <div v-for="(c, ci) in o.choices" :key="c.id" class="mt-3 rounded-md bg-surface-2 p-3">
                  <div class="flex items-start gap-2">
                    <div class="flex-1"><LocalizedInput v-model="c.label" :maxlength="80" /></div>
                    <UiButton
                      square
                      size="sm"
                      variant="ghost"
                      :aria-label="$t('common.remove')"
                      :disabled="o.choices.length === 1"
                      @click="o.choices.splice(ci, 1)"
                      ><Trash2 class="size-3.5"
                    /></UiButton>
                  </div>
                  <div class="mt-2">
                    <PriceMatrix
                      v-model="c.prices"
                      :currencies="allCurrencies"
                      :cycles="['monthly', 'quarterly', 'annually']"
                      :setup="false"
                    />
                  </div>
                </div>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="mt-2"
                  @click="
                    o.choices.push({ id: `new-c-${Date.now()}`, label: { 'zh-CN': '', en: '' }, prices: [] })
                  "
                  ><Plus class="size-3.5" />{{ $t('admin.product.addChoice') }}</UiButton
                >
              </template>
              <template v-else-if="o.kind === 'quantity'">
                <div class="mt-3 grid max-w-xs grid-cols-2 gap-3">
                  <UiField :label="$t('admin.product.min')"
                    ><template #default="{ id }"
                      ><UiInput :id="id" v-model.number="o.min" type="number" min="0" /></template
                  ></UiField>
                  <UiField :label="$t('admin.product.max')"
                    ><template #default="{ id }"
                      ><UiInput :id="id" v-model.number="o.max" type="number" min="0" /></template
                  ></UiField>
                </div>
                <p class="mt-3 mb-2 text-xs text-muted">{{ $t('admin.product.unitPrice') }}</p>
                <PriceMatrix
                  :model-value="o.unit_prices ?? []"
                  :currencies="allCurrencies"
                  :cycles="['monthly', 'quarterly', 'annually']"
                  :setup="false"
                  @update:model-value="(v) => (o.unit_prices = v)"
                />
              </template>
            </div>
            <div class="flex gap-2">
              <UiButton size="sm" @click="addOption('select')"
                ><Plus class="size-3.5" />{{ $t('admin.product.addSelect') }}</UiButton
              >
              <UiButton size="sm" @click="addOption('quantity')"
                ><Plus class="size-3.5" />{{ $t('admin.product.addQuantity') }}</UiButton
              >
            </div>
          </div>
        </UiCard>
      </div>

      <div class="flex flex-col gap-6">
        <UiCard :title="$t('admin.product.publishing')">
          <div class="flex flex-col gap-4">
            <UiField :label="$t('admin.product.visibilityLabel')">
              <template #default="{ id }"
                ><UiSelect
                  :id="id"
                  v-model="form.visibility"
                  :options="
                    (['public', 'hidden', 'retired'] as const).map((v) => ({
                      value: v,
                      label: $t(`admin.product.visibility.${v}`),
                      hint: $t(`admin.product.visibilityHint.${v}`),
                    }))
                  "
              /></template>
            </UiField>
            <UiField :label="$t('admin.product.stock')">
              <template #default="{ id }">
                <div class="flex flex-col gap-2">
                  <UiInput
                    v-if="form.stock !== null"
                    :id="id"
                    v-model.number="form.stock"
                    type="number"
                    min="0"
                  />
                  <UiCheckbox v-model="stockUnlimited" :label="$t('admin.product.unlimited')" />
                </div>
              </template>
            </UiField>
            <UiField :label="$t('admin.product.sortOrder')"
              ><template #default="{ id }"
                ><UiInput :id="id" v-model.number="form.sort_order" type="number" /></template
            ></UiField>
            <div class="flex flex-col gap-2">
              <p class="text-[13px] font-medium text-fg-2">{{ $t('admin.product.badges') }}</p>
              <UiCheckbox
                v-for="b in BADGES"
                :key="b"
                :model-value="form.badges.includes(b)"
                :label="$t(`store.badge.${b}`)"
                @update:model-value="(v: boolean) => toggleBadge(b, v)"
              />
            </div>
          </div>
        </UiCard>

        <ProductProvisioning ref="provisioning" v-model="form.module" />

        <UiCard
          v-if="form.kind === 'cloud_server'"
          :title="$t('configure.os')"
          :description="$t('admin.product.imagesHint')"
        >
          <UiSkeleton v-if="!images.data.value" :lines="4" />
          <p v-else-if="!images.data.value.length" class="text-[13px] text-muted">
            {{ $t('admin.catalog.noImages') }}
          </p>
          <div v-else class="flex max-h-72 flex-col gap-2 overflow-y-auto">
            <UiCheckbox
              v-for="img in images.data.value.filter((i) => i.enabled)"
              :key="img.id"
              :model-value="form.os_image_ids.includes(img.id)"
              @update:model-value="(v: boolean) => toggleImage(img.id, v)"
            >
              {{ img.name }} {{ img.version
              }}<span class="ml-1 text-xs text-faint">≥{{ img.min_disk_gb }}G</span>
            </UiCheckbox>
          </div>
        </UiCard>
        <p v-if="saveError" class="text-[13px] text-danger" role="alert">{{ saveError }}</p>
      </div>
    </fieldset>
  </div>
</template>
