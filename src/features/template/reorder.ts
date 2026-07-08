/**
 * Pure reorder logic for the template field list. Kept framework-free so the
 * reorder *result* is unit-testable without simulating a drag. The store's
 * reorderFields turns the returned id order into `order` numbers.
 */

/**
 * Move the id `activeId` to the position currently held by `overId`, returning
 * the new id order. If either id is absent, the list is returned unchanged.
 */
export function moveField(ids: string[], activeId: string, overId: string): string[] {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1 || from === to) {
    return ids;
  }
  const without = ids.filter((_, index) => index !== from);
  without.splice(to, 0, activeId);
  return without;
}

/**
 * Decide the new field id order after a drag ends. Returns null when there is
 * nothing to do (dropped outside any target, or back onto itself), so the
 * component wrapper stays trivial.
 */
export function fieldOrderAfterDragEnd(
  fieldIds: string[],
  activeId: string,
  overId: string | null,
): string[] | null {
  if (overId === null || activeId === overId) {
    return null;
  }
  return moveField(fieldIds, activeId, overId);
}
