<script setup lang="ts" generic="T">
import { useRouter, type RouteLocationRaw } from 'vue-router'
import UiSkeleton from './UiSkeleton.vue'

export interface Column {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  /** Hide on viewports narrower than this breakpoint. */
  hideBelow?: 'sm' | 'md' | 'lg'
  class?: string
}
const props = defineProps<{
  columns: Column[]
  rows: T[]
  rowKey: (row: T) => string
  to?: (row: T) => RouteLocationRaw
  loading?: boolean
}>()
const router = useRouter()
const cell = (row: T, key: string) => (row as Record<string, unknown>)[key]
const hide = (c: Column) =>
  c.hideBelow === 'sm'
    ? 'hidden sm:table-cell'
    : c.hideBelow === 'md'
      ? 'hidden md:table-cell'
      : c.hideBelow === 'lg'
        ? 'hidden lg:table-cell'
        : ''
const align = (c: Column) =>
  c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
function open(row: T, e: MouseEvent) {
  if (!props.to) return
  const target = e.target as HTMLElement
  if (target.closest('a,button,input,[role=menuitem]')) return
  const loc = props.to(row)
  if (e.metaKey || e.ctrlKey) window.open(router.resolve(loc).href, '_blank', 'noopener')
  else void router.push(loc)
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="border-b border-line">
          <th
            v-for="c in columns"
            :key="c.key"
            scope="col"
            :class="[
              'h-10 px-4 text-xs font-medium whitespace-nowrap text-muted first:pl-5 last:pr-5',
              align(c),
              hide(c),
              c.class,
            ]"
          >
            {{ c.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-if="loading && !rows.length">
          <tr v-for="i in 5" :key="i" class="border-b border-line last:border-0">
            <td v-for="c in columns" :key="c.key" :class="['px-4 py-3.5 first:pl-5 last:pr-5', hide(c)]">
              <UiSkeleton height="h-3.5" />
            </td>
          </tr>
        </template>
        <tr
          v-for="row in rows"
          :key="rowKey(row)"
          :class="[
            'border-b border-line transition-colors last:border-0',
            to && 'cursor-pointer hover:bg-surface-2',
          ]"
          @click="open(row, $event)"
        >
          <td
            v-for="c in columns"
            :key="c.key"
            :class="['px-4 py-3 align-middle first:pl-5 last:pr-5', align(c), hide(c), c.class]"
          >
            <slot :name="`cell-${c.key}`" :row="row">{{ cell(row, c.key) }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
    <slot v-if="!loading && !rows.length" name="empty" />
  </div>
</template>
