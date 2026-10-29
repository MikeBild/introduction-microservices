// Verträge des Werkstatt-Shops (siehe README, Abschnitt „Der Werkstatt-Shop“).
// Ein Vertrag gehört dem Service, der ihn anbietet. Hier liegen nur die veröffentlichten
// Teile: Request- und Response-Bodys der APIs und die Events zwischen den Services.
import { z } from 'zod'

// --- Katalog (Service catalog) ---------------------------------------------------------
export const Product = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().min(0),
})
export type Product = z.infer<typeof Product>

// --- Bestellung (Service orders) -------------------------------------------------------
export const OrderItemInput = z.strictObject({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
})
export const PlaceOrderInput = z.strictObject({
  customerId: z.string().min(1),
  items: z.array(OrderItemInput).min(1),
})
export type PlaceOrderInput = z.infer<typeof PlaceOrderInput>

export const OrderStatus = z.enum(['draft', 'placed', 'paid', 'shipped', 'cancelled'])
export type OrderStatus = z.infer<typeof OrderStatus>

export const OrderItem = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  priceCents: z.number().int().min(0),
})
export type OrderItem = z.infer<typeof OrderItem>

export const Order = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  items: z.array(OrderItem).min(1),
  status: OrderStatus,
  createdAt: z.iso.datetime(),
})
export type Order = z.infer<typeof Order>

// --- Events ----------------------------------------------------------------------------
// Jedes Event hat eine eindeutige id (für Idempotenz beim Empfänger), einen Typ in der
// Vergangenheitsform und die fachlichen Daten.
const envelope = <T extends string, D extends z.ZodType>(type: T, data: D) =>
  z.object({ id: z.string().min(1), type: z.literal(type), occurredAt: z.iso.datetime(), data })

const Line = z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) })

export const OrderPlaced = envelope(
  'OrderPlaced',
  z.object({ orderId: z.string().min(1), items: z.array(Line).min(1) }),
)
export const OrderCancelled = envelope(
  'OrderCancelled',
  z.object({ orderId: z.string().min(1), reason: z.string().min(1) }),
)
export const StockReserved = envelope('StockReserved', z.object({ orderId: z.string().min(1) }))
export const StockRejected = envelope(
  'StockRejected',
  z.object({ orderId: z.string().min(1), productId: z.string().min(1) }),
)

export const ShopEvent = z.discriminatedUnion('type', [OrderPlaced, OrderCancelled, StockReserved, StockRejected])
export type ShopEvent = z.infer<typeof ShopEvent>
export type ShopEventType = ShopEvent['type']
export type EventOf<T extends ShopEventType> = Extract<ShopEvent, { type: T }>
