import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './app/App.vue'
import { router } from './app/router'
import { createApi, fetchTransport } from './shared/api'
import { queryClient } from './shared/api/query-client'
import { detectLocale, i18n, setLocale } from './shared/i18n'
import { usePrefs } from './shared/stores/prefs'
import { useSession } from './shared/stores/session'
import './styles/main.css'

const pinia = createPinia()
createApi(fetchTransport, {
  onSessionEnded: () => {
    useSession(pinia).ended()
    queryClient.clear()
    const here = router.currentRoute.value
    const priv = here.matched.some((r) => r.meta.access === 'client' || r.meta.access === 'staff')
    if (priv) void router.replace({ name: 'login', query: { redirect: here.fullPath } })
  },
})

const app = createApp(App)
app.use(pinia)
app.use(VueQueryPlugin, { queryClient })
app.use(i18n)
setLocale(detectLocale(usePrefs(pinia).locale))
app.use(router)
app.mount('#app')
