<script setup lang="ts">
withDefaults(defineProps<{ logo?: 'star' | 'cloud' | 'server' | 'orbit'; size?: number }>(), {
  logo: 'orbit',
  size: 28,
})
</script>

<template>
  <span
    class="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[9px] bg-gradient-to-b from-[#5b8cff] to-[#2f5ee8] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_1px_2px_rgb(0_0_0/0.2)]"
    :style="{ width: size + 'px', height: size + 'px' }"
    aria-hidden="true"
  >
    <svg
      :width="size * 0.62"
      :height="size * 0.62"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <template v-if="logo === 'orbit'">
        <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
        <ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-28 12 12)" />
      </template>
      <path
        v-else-if="logo === 'star'"
        d="M12 3l2.6 5.8 6.4.6-4.8 4.3 1.4 6.3L12 16.8 6.4 20l1.4-6.3L3 9.4l6.4-.6z"
      />
      <path
        v-else-if="logo === 'cloud'"
        d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4.25 4.25 0 0 1-.5 8.5z"
      />
      <template v-else>
        <rect x="4" y="4" width="16" height="6.5" rx="1.5" />
        <rect x="4" y="13.5" width="16" height="6.5" rx="1.5" />
        <path d="M8 7.25h.01M8 16.75h.01" />
      </template>
    </svg>
  </span>
</template>
