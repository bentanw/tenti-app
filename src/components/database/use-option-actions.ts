import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { OPTION_COLORS, type SelectOption } from '#/lib/types'
import { deleteSelectOption, updateProperty } from '#/server/databases'
import type { CellProperty } from './property-cell'

export type OptionActions = {
  create: (name: string) => Promise<SelectOption>
  update: (option: SelectOption) => void
  remove: (optionId: string) => void
}

/** Create / rename / recolor / delete SELECT options. Returns actions for a given property. */
export function useOptionActions(properties: CellProperty[]) {
  const router = useRouter()
  const save = useServerFn(updateProperty)
  const destroy = useServerFn(deleteSelectOption)

  const refresh = () => router.invalidate()
  const onError = (err: unknown) => {
    toast.error(err instanceof Error ? err.message : 'Could not update option')
    refresh()
  }
  const optionsOf = (propertyId: string) =>
    properties.find((p) => p.id === propertyId)?.options ?? []

  return (propertyId: string): OptionActions => ({
    create: async (name) => {
      const option: SelectOption = {
        id: crypto.randomUUID(),
        name,
        color: OPTION_COLORS[Math.floor(Math.random() * OPTION_COLORS.length)],
      }
      await save({ data: { id: propertyId, options: [...optionsOf(propertyId), option] } })
      refresh()
      return option
    },
    update: (option) => {
      const options = optionsOf(propertyId).map((o) => (o.id === option.id ? option : o))
      save({ data: { id: propertyId, options } }).then(refresh, onError)
    },
    remove: (optionId) => {
      destroy({ data: { propertyId, optionId } }).then(refresh, onError)
    },
  })
}
