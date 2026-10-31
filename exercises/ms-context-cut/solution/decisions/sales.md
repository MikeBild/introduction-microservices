# ADR: Verkauf ist ein eigener Service

## Kontext

| Frage                                  | Antwort                                                                 |
|----------------------------------------|-------------------------------------------------------------------------|
| Kippt an der Grenze ein Wort?          | Ja: „Customer“ ist hier, wer die Rechnung bekommt, nicht die Lieferadresse |
| Müssen Regeln sofort gemeinsam gelten? | Ja: Summe und Status brauchen Positionen und Preise in einer Transaktion |
| Ändert es sich meist im selben Commit? | Ja: Order, OrderItem und BillingContact ändern sich zusammen            |
| Eigenes Team oder eigene Last?         | Ja: Das Verkaufsteam deployt wöchentlich, unabhängig vom Lager          |

## Entscheidung

Service `sales` besitzt `Customer`, `BillingContact`, `Order` und `OrderItem`. Er holt Preise per HTTP
beim Katalog, veröffentlicht `OrderPlaced` und reagiert auf `StockReserved` und `StockRejected`.

## Verworfen

`OrderService` und `CustomerService` getrennt: Beide änderten sich in acht von zehn Commits
gemeinsam, aus einem Commit wäre ein verteiltes Release geworden.
