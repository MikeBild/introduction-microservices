// Lesson ms-sagas: Sagas replace distributed transactions
// Duration: about 25 minutes
//
// An order runs through three services: orders → inventory → payment.
// There is no transaction across all of them. The saga in orders reacts to messages and triggers
// follow-up steps or compensations. It is a Pure Function: state + message → state + effects.
//
// Task: Implement react(state, message).
// - StockReserved (placed, stock pending)  → stock 'reserved', effect CapturePayment
// - StockRejected (placed, stock pending)  → status 'cancelled', effect OrderCancelled (reason 'out of stock: <productId>')
// - PaymentCaptured (placed, stock reserved) → status 'paid'
// - PaymentFailed (placed) → status 'cancelled'; if stock was reserved: compensation ReleaseStock and stock 'released';
//   then OrderCancelled (reason 'payment failed: <reason>')
// - StockReserved arrives only after the cancellation → ReleaseStock, stock 'released'
// - Everything else (duplicates, latecomers) → state unchanged, no effects
//
// Check: npm test -- ms-sagas
export type SagaState = {
  orderId: string
  status: 'placed' | 'paid' | 'cancelled'
  stock: 'pending' | 'reserved' | 'released'
}

export type SagaMessage =
  | { type: 'StockReserved' }
  | { type: 'StockRejected'; productId: string }
  | { type: 'PaymentCaptured' }
  | { type: 'PaymentFailed'; reason: string }

export type Effect =
  | { type: 'CapturePayment'; orderId: string }
  | { type: 'ReleaseStock'; orderId: string }
  | { type: 'OrderCancelled'; orderId: string; reason: string }

export const start = (orderId: string): SagaState => ({ orderId, status: 'placed', stock: 'pending' })

export const react = (state: SagaState, message: SagaMessage): { state: SagaState; effects: Effect[] } => {
  switch (message.type) {
    case 'StockReserved':
      // Pitfall: building only the happy path
      return { state: { ...state, stock: 'reserved' }, effects: [{ type: 'CapturePayment', orderId: state.orderId }] }
    default:
      throw new Error(`TODO: ${message.type}`)
  }
}
