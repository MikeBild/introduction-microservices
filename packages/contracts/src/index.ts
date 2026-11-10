// Contracts of the workshop shop (see README, section “The workshop shop”).
// A contract belongs to the service that offers it. Only the published parts live here:
// request and response bodies of the APIs and the events between the services.
import { z } from 'zod'

// --- Catalog (service catalog) ---------------------------------------------------------
export const Product = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().min(0),
})
export type Product = z.infer<typeof Product>

// --- Order (service orders) ------------------------------------------------------------
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
// Every event has a unique id (for idempotency at the receiver), a type in the
// past tense and the domain data.
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
