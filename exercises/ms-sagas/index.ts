// Lektion ms-sagas: Sagas ersetzen verteilte Transaktionen
// Dauer: etwa 25 Minuten
//
// Eine Bestellung läuft durch drei Services: orders → inventory (Bestand) → payment (Zahlung).
// Es gibt keine Transaktion über alle. Die Saga in orders reagiert auf Nachrichten und löst
// Folgeschritte oder Kompensationen aus. Sie ist eine reine Funktion: Zustand + Nachricht → Zustand + Effekte.
//
// Aufgabe: Implementiere react(state, message).
// - StockReserved (placed, Bestand pending)  → stock 'reserved', Effekt CapturePayment
// - StockRejected (placed, Bestand pending)  → status 'cancelled', Effekt OrderCancelled (reason 'out of stock: <productId>')
// - PaymentCaptured (placed, Bestand reserviert) → status 'paid'
// - PaymentFailed (placed) → status 'cancelled'; war Bestand reserviert: Kompensation ReleaseStock und stock 'released';
//   dann OrderCancelled (reason 'payment failed: <reason>')
// - StockReserved kommt erst nach der Stornierung → ReleaseStock, stock 'released'
// - Alles andere (Duplikate, Nachzügler) → Zustand unverändert, keine Effekte
//
// Prüfen: npm test -- ms-sagas
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
      // Fallstrick: nur den Happy Path bauen
      return { state: { ...state, stock: 'reserved' }, effects: [{ type: 'CapturePayment', orderId: state.orderId }] }
    default:
      throw new Error(`TODO: ${message.type}`)
  }
}
