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
  it('Happy Path: reservieren, bezahlen', () => {
    const { state, effects } = run([{ type: 'StockReserved' }, { type: 'PaymentCaptured' }])
    expect(state).toEqual({ orderId: 'o-1', status: 'paid', stock: 'reserved' })
    expect(effects).toEqual([{ type: 'CapturePayment', orderId: 'o-1' }])
  })

  it('kein Bestand: Bestellung storniert, keine Zahlung', () => {
    const { state, effects } = run([{ type: 'StockRejected', productId: 'p-2' }])
    expect(state.status).toBe('cancelled')
    expect(effects).toEqual([{ type: 'OrderCancelled', orderId: 'o-1', reason: 'out of stock: p-2' }])
  })

  it('Zahlung scheitert: Bestand freigeben (Kompensation), dann stornieren', () => {
    const { state, effects } = run([{ type: 'StockReserved' }, { type: 'PaymentFailed', reason: 'card declined' }])
    expect(state).toEqual({ orderId: 'o-1', status: 'cancelled', stock: 'released' })
    expect(effects).toEqual([
      { type: 'CapturePayment', orderId: 'o-1' },
      { type: 'ReleaseStock', orderId: 'o-1' },
      { type: 'OrderCancelled', orderId: 'o-1', reason: 'payment failed: card declined' },
    ])
  })

  it('ignoriert doppelte Nachrichten', () => {
    const { effects } = run([{ type: 'StockReserved' }, { type: 'StockReserved' }, { type: 'PaymentCaptured' }, { type: 'PaymentCaptured' }])
    expect(effects).toEqual([{ type: 'CapturePayment', orderId: 'o-1' }])
  })

  it('gibt eine verspätete Reservierung nach der Stornierung wieder frei', () => {
    const { state, effects } = run([
      { type: 'PaymentFailed', reason: 'timeout' },
      { type: 'StockReserved' },
    ])
    expect(state.stock).toBe('released')
    expect(effects.at(-1)).toEqual({ type: 'ReleaseStock', orderId: 'o-1' })
  })
})
