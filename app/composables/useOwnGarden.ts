/** Asks, then swaps the demo garden for an empty one. */
export function useOwnGarden() {
  const grow = useGrow()
  const { confirm } = useConfirm()
  const { notify } = useNotify()
  const { t } = useI18n()

  return async function startOwnGarden() {
    if (grow.preview.value) {
      await grow.startOwnGarden()
      notify(t('showcase.own.savedDone'))
      navigateTo('/')
      return
    }
    const ok = await confirm({
      title: t('showcase.own.title'),
      message: t('showcase.own.message'),
      confirmLabel: t('showcase.own.confirm')
    })
    if (!ok) return
    await grow.startOwnGarden()
    notify(t('showcase.own.done'))
    navigateTo('/')
  }
}
