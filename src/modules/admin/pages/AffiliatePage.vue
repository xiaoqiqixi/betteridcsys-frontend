<script setup lang="ts">
import { useSession } from '@/shared/stores/session'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import AffiliateSettingsForm from '../components/affiliate/AffiliateSettingsForm.vue'
import AffiliatesList from '../components/affiliate/AffiliatesList.vue'
const session = useSession()
</script>
<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.affiliate')" :description="$t('affAdmin.subtitle')" />
    <AffiliateSettingsForm />
    <AffiliatesList v-if="session.can('clients.write')" />
  </div>
</template>
