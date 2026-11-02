<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
import { defineAsyncComponent, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useSite } from '@/shared/composables/site'
import { setLocale, detectLocale } from '@/shared/i18n'
import { usePrefs } from '@/shared/stores/prefs'
import { useSession } from '@/shared/stores/session'
import { confirmState } from '@/shared/composables/confirm'
const ConfirmHost = defineAsyncComponent(() => import('@/shared/ui/ConfirmHost.vue'))
import UiToaster from '@/shared/ui/UiToaster.vue'

const site = useSite()
const prefs = usePrefs()
const session = useSession()
const route = useRoute()
const { t } = useI18n()

// Site defaults apply until the visitor or the account chooses otherwise.
watch(
  () => [site.settings.data.value?.default_locale, session.user?.locale, prefs.locale] as const,
  ([siteDefault, account, chosen]) => setLocale(chosen ?? account ?? detectLocale(null, siteDefault)),
  { immediate: true },
)
watchEffect(() => prefs.setAccent(site.settings.data.value?.accent ?? 'blue'))
watchEffect(() => {
  const key = route.meta.title
  const name = site.name.value
  document.title = key ? `${t(key)} · ${name}` : name
})
</script>

<template>
  <TooltipProvider>
    <RouterView />
    <UiToaster />
    <ConfirmHost v-if="confirmState.current" />
  </TooltipProvider>
</template>
