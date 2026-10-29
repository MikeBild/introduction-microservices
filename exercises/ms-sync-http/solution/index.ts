// Lösung ms-sync-http
import { Product, type OrderItem, type PlaceOrderInput } from '@werkstatt/contracts'

export class CatalogUnavailable extends Error {
  override name = 'CatalogUnavailable'
}
export class UnknownProduct extends Error {
  override name = 'UnknownProduct'
}

export type CatalogClient = { product: (productId: string) => Promise<Product | undefined> }

export const createCatalogClient = (baseUrl: string, { timeoutMs = 500 } = {}): CatalogClient => ({
  async product(productId) {
    let response: Response
    try {
      response = await fetch(`${baseUrl}/products/${encodeURIComponent(productId)}`, {
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      throw new CatalogUnavailable(`catalog not reachable: ${String(error)}`, { cause: error })
    }
    if (response.status === 404) return undefined
    if (!response.ok) throw new CatalogUnavailable(`catalog answered ${response.status}`)
    return Product.parse(await response.json())
  },
})

/** Preise kommen immer aus dem Katalog, nie aus dem Request des Clients. */
export const priceOrder = async (input: PlaceOrderInput, catalog: CatalogClient): Promise<OrderItem[]> =>
  Promise.all(
    input.items.map(async (item) => {
      const product = await catalog.product(item.productId)
      if (!product) throw new UnknownProduct(item.productId)
      return { productId: item.productId, quantity: item.quantity, priceCents: product.priceCents }
    }),
  )
