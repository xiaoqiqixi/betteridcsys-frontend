<template>
  <div class="rounded-xl border border-line bg-surface p-5" aria-hidden="true">
    <div class="skeleton h-3 w-24 rounded" />
    <div class="skeleton mt-2 h-5 w-40 rounded" />
    <div class="mt-5 grid grid-cols-2 gap-3">
      <div v-for="i in 6" :key="i" class="skeleton h-3.5 rounded" />
    </div>
    <div class="mt-6 flex items-end justify-between border-t border-line pt-4">
      <div class="skeleton h-7 w-28 rounded" />
      <div class="skeleton h-8 w-20 rounded-md" />
    </div>
  </div>
</template>
