// Lektion ms-sync-http: Ein synchroner Aufruf koppelt die Verfügbarkeit
// Dauer: etwa 20 Minuten
//
// orders fragt beim Bestellen den Service catalog nach den Preisen. Ist catalog langsam oder weg,
// darf orders nicht ewig warten.
//
// Aufgabe:
// 1. createCatalogClient(baseUrl, { timeoutMs }): product(id) ruft GET /products/:id per fetch auf.
//    Mit AbortSignal.timeout(timeoutMs) abbrechen. 404 → undefined. Netzfehler, Timeout und 5xx → CatalogUnavailable.
//    Die Antwort mit dem Schema Product aus @werkstatt/contracts prüfen.
// 2. priceOrder(input, catalog): Preise je Position aus dem Katalog holen (parallel), unbekannte Produkte → UnknownProduct.
//
// Prüfen: npm test -- ms-sync-http
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
    // Fallstrick: kein Timeout, kein Status-Check, keine Prüfung der Antwort
    const response = await fetch(`${baseUrl}/products/${productId}`)
    void timeoutMs
    void Product
    return (await response.json()) as Product
  },
})

export const priceOrder = async (input: PlaceOrderInput, catalog: CatalogClient): Promise<OrderItem[]> => {
  throw new Error('TODO: Preise aus dem Katalog holen')
}
