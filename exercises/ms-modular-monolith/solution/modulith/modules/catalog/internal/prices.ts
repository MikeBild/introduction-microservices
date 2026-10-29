const prices = new Map([
  ['p-1', 1299],
  ['p-2', 8999],
])

export const priceOf = (productId: string): number | undefined => prices.get(productId)
