import { useRive } from '@rive-app/react-canvas'
import { cn } from '#/lib/utils'

/**
 * Animated Tenti mascot (public/tenti.riv). Hover handling lives in the Rive file: listeners on the
 * mascot's hit area flip the `isHovered` view-model boolean, which plays the explode state.
 *
 * The artboard leaves room around the mascot for the explosion, so the canvas is 2x the slot it
 * sits in and overflows it evenly; `className` sizes the slot, as it did for the old <img>.
 */
export function TentiMascot({ className }: { className?: string }) {
  const { RiveComponent } = useRive({
    src: '/tenti.riv',
    artboard: 'Tenti',
    stateMachine: 'Hover',
    autoplay: true,
    autoBind: true,
  })

  return (
    <div className={cn('relative', className)}>
      <RiveComponent aria-hidden className="-translate-1/2 absolute top-1/2 left-1/2 size-[200%]" />
    </div>
  )
}
