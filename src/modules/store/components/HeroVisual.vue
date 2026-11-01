<script setup lang="ts">
import { Activity, Cpu, Globe2, Server } from '@lucide/vue'

/** Decorative product preview for the landing hero (no live data, no claims). */
const bars = [32, 44, 38, 56, 48, 62, 54, 70, 58, 66, 52, 60, 74, 64, 70, 58, 66, 72, 61, 68]
</script>

<template>
  <div class="relative" aria-hidden="true">
    <div
      class="absolute -inset-10 rounded-[40px] bg-[radial-gradient(closest-side,var(--glow-a),transparent)] blur-2xl"
    />
    <div
      class="relative rotate-[-1.5deg] rounded-2xl border border-line bg-elevated/80 p-4 shadow-lg backdrop-blur-xl"
    >
      <div class="flex items-center gap-1.5 border-b border-line pb-3">
        <span class="size-2.5 rounded-full bg-[#ff5f57]" /><span
          class="size-2.5 rounded-full bg-[#febc2e]"
        /><span class="size-2.5 rounded-full bg-[#28c840]" />
        <span class="ml-3 font-mono text-[11px] text-faint">console / services / web-01</span>
      </div>
      <div class="mt-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary"
            ><Server class="size-4"
          /></span>
          <div>
            <p class="text-sm font-semibold text-fg">web-01</p>
            <p class="flex items-center gap-1 text-xs text-muted">
              <Globe2 class="size-3" />Tokyo · 2 vCPU · 4 GB
            </p>
          </div>
        </div>
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success"
        >
          <span class="relative flex size-1.5"
            ><span class="absolute inset-0 animate-ping rounded-full bg-current opacity-60" /><span
              class="relative size-1.5 rounded-full bg-current"
          /></span>
          Running
        </span>
      </div>
      <div class="mt-4 grid grid-cols-3 gap-2">
        <div
          v-for="(m, i) in [
            { k: 'CPU', v: '18%' },
            { k: 'Memory', v: '1.6 GB' },
            { k: 'Network', v: '42 Mbps' },
          ]"
          :key="i"
          class="rounded-lg border border-line bg-surface p-2.5"
        >
          <p class="text-[10px] tracking-wide text-faint uppercase">{{ m.k }}</p>
          <p class="num mt-0.5 text-sm font-semibold text-fg">{{ m.v }}</p>
        </div>
      </div>
      <div class="mt-3 flex h-16 items-end gap-1 rounded-lg border border-line bg-surface p-2.5">
        <span
          v-for="(h, i) in bars"
          :key="i"
          class="flex-1 rounded-sm bg-gradient-to-t from-primary/30 to-primary"
          :style="{ height: h + '%' }"
        />
      </div>
      <div class="mt-3 rounded-lg bg-[#0b0d12] p-3 font-mono text-[11.5px] leading-relaxed text-[#c4c9d3]">
        <p><span class="text-[#4cc3ff]">$</span> ssh root@web-01</p>
        <p class="text-[#8b92a1]">Welcome to Ubuntu 24.04 LTS</p>
        <p>
          <span class="text-[#34d27a]">root@web-01</span>:~#
          <span class="inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-[#c4c9d3]" />
        </p>
      </div>
    </div>
    <div
      class="absolute -bottom-6 -left-8 hidden rotate-[2deg] items-center gap-2.5 rounded-xl border border-line bg-elevated/90 px-3.5 py-2.5 shadow-md backdrop-blur xl:flex"
    >
      <Activity class="size-4 text-primary" />
      <div>
        <p class="text-xs font-medium text-fg">Snapshot ready</p>
        <p class="text-[11px] text-muted">before-upgrade · 12.4 GB</p>
      </div>
    </div>
    <div
      class="absolute -top-5 -right-4 hidden rotate-[3deg] items-center gap-2 rounded-xl border border-line bg-elevated/90 px-3 py-2 shadow-md backdrop-blur xl:flex"
    >
      <Cpu class="size-3.5 text-success" />
      <p class="text-[11px] font-medium text-fg">Provisioned in 38s</p>
    </div>
  </div>
</template>
