export const total = (items: ReadonlyArray<{ quantity: number; priceCents: number }>) =>
  items.reduce((sum, item) => sum + item.quantity * item.priceCents, 0)
