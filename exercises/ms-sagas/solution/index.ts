// Lösung ms-sagas
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

/** Pure Function: alter Zustand + Nachricht → neuer Zustand + Effekte. Kein I/O, gut testbar. */
export const react = (state: SagaState, message: SagaMessage): { state: SagaState; effects: Effect[] } => {
  const { orderId } = state
  switch (message.type) {
    case 'StockReserved':
      if (state.status === 'cancelled' && state.stock === 'pending')
        return { state: { ...state, stock: 'released' }, effects: [{ type: 'ReleaseStock', orderId }] }
      if (state.status !== 'placed' || state.stock !== 'pending') return { state, effects: [] }
      return { state: { ...state, stock: 'reserved' }, effects: [{ type: 'CapturePayment', orderId }] }

    case 'StockRejected':
      if (state.status !== 'placed' || state.stock !== 'pending') return { state, effects: [] }
      return {
        state: { ...state, status: 'cancelled' },
        effects: [{ type: 'OrderCancelled', orderId, reason: `out of stock: ${message.productId}` }],
      }

    case 'PaymentCaptured':
      if (state.status !== 'placed' || state.stock !== 'reserved') return { state, effects: [] }
      return { state: { ...state, status: 'paid' }, effects: [] }

    case 'PaymentFailed':
      if (state.status !== 'placed') return { state, effects: [] }
      return {
        state: { ...state, status: 'cancelled', stock: state.stock === 'reserved' ? 'released' : state.stock },
        effects: [
          ...(state.stock === 'reserved' ? [{ type: 'ReleaseStock', orderId } as const] : []),
          { type: 'OrderCancelled', orderId, reason: `payment failed: ${message.reason}` },
        ],
      }
  }
}
