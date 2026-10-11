import type { ThreeEvent } from '@react-three/fiber';
import { useSimStore } from '../store/useSimStore';
import type { EntityKind } from '../world/snapshot';

/** Pointer handlers that make a 3D object selectable. */
export function selectable(kind: EntityKind, id: number) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      useSimStore.getState().select({ kind, id });
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      document.body.style.cursor = '';
    },
  };
}
