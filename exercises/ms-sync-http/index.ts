// Lesson ms-sync-http: A synchronous call couples availability
// Duration: about 20 minutes
//
// When an order is placed, orders asks the service catalog for the prices. If catalog is slow or gone,
// orders must not wait forever.
//
// Task:
// 1. createCatalogClient(baseUrl, { timeoutMs }): product(id) calls GET /products/:id via fetch.
//    Abort with AbortSignal.timeout(timeoutMs). 404 → undefined. Network errors, timeout and 5xx → CatalogUnavailable.
//    Validate the response with the schema Product from @werkstatt/contracts.
// 2. priceOrder(input, catalog): fetch the price for each line item from the catalog (in parallel), unknown products → UnknownProduct.
//
// Check: npm test -- ms-sync-http
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
    // Pitfall: no timeout, no status check, no validation of the response
    const response = await fetch(`${baseUrl}/products/${productId}`)
    void timeoutMs
    void Product
    return (await response.json()) as Product
  },
})

export const priceOrder = async (input: PlaceOrderInput, catalog: CatalogClient): Promise<OrderItem[]> => {
  throw new Error('TODO: Preise aus dem Katalog holen')
}
