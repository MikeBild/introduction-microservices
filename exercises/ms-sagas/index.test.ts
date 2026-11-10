import { describe, expect, it } from 'vitest'
import { react, start, type Effect, type SagaMessage, type SagaState } from '#ex/ms-sagas'

const run = (messages: SagaMessage[]) =>
  messages.reduce<{ state: SagaState; effects: Effect[] }>(
    (acc, message) => {
      const next = react(acc.state, message)
      return { state: next.state, effects: [...acc.effects, ...next.effects] }
    },
    { state: start('o-1'), effects: [] },
  )

describe('order saga', () => {
  it('happy path: reserve, pay', () => {
    const { state, effects } = run([{ type: 'StockReserved' }, { type: 'PaymentCaptured' }])
    expect(state).toEqual({ orderId: 'o-1', status: 'paid', stock: 'reserved' })
    expect(effects).toEqual([{ type: 'CapturePayment', orderId: 'o-1' }])
  })

  it('no stock: order cancelled, no payment', () => {
    const { state, effects } = run([{ type: 'StockRejected', productId: 'p-2' }])
    expect(state.status).toBe('cancelled')
    expect(effects).toEqual([{ type: 'OrderCancelled', orderId: 'o-1', reason: 'out of stock: p-2' }])
  })

  it('payment fails: release stock (compensation), then cancel', () => {
    const { state, effects } = run([{ type: 'StockReserved' }, { type: 'PaymentFailed', reason: 'card declined' }])
    expect(state).toEqual({ orderId: 'o-1', status: 'cancelled', stock: 'released' })
    expect(effects).toEqual([
      { type: 'CapturePayment', orderId: 'o-1' },
      { type: 'ReleaseStock', orderId: 'o-1' },
      { type: 'OrderCancelled', orderId: 'o-1', reason: 'payment failed: card declined' },
    ])
  })

  it('ignores duplicate messages', () => {
    const { effects } = run([{ type: 'StockReserved' }, { type: 'StockReserved' }, { type: 'PaymentCaptured' }, { type: 'PaymentCaptured' }])
    expect(effects).toEqual([{ type: 'CapturePayment', orderId: 'o-1' }])
  })

  it('releases a late reservation after the cancellation', () => {
    const { state, effects } = run([
      { type: 'PaymentFailed', reason: 'timeout' },
      { type: 'StockReserved' },
    ])
    expect(state.stock).toBe('released')
    expect(effects.at(-1)).toEqual({ type: 'ReleaseStock', orderId: 'o-1' })
  })
})
