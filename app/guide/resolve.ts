import { defineAsyncComponent, type Component } from 'vue'

/** 'leaf-nitrogen', 'LeafNitrogen.vue' and 'leaf_nitrogen' all resolve to the same key. */
export const componentKey = (name: string) => name.split('/').pop()!.replace(/\.vue$/, '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function asyncRegistry(modules: Record<string, () => Promise<unknown>>): Map<string, Component> {
  const map = new Map<string, Component>()
  for (const [path, load] of Object.entries(modules)) {
    map.set(componentKey(path), defineAsyncComponent(load as () => Promise<Component>))
  }
  return map
}
