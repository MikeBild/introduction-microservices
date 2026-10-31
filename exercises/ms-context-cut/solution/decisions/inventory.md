# ADR: Lager ist ein eigener Service

## Kontext

| Frage                                  | Antwort                                                              |
|----------------------------------------|----------------------------------------------------------------------|
| Wechselt ein Wort die Bedeutung?       | Ja: „Product“ ist hier Bestand und Lagerort, kein Preis              |
| Müssen Regeln sofort gemeinsam gelten? | Ja: Eine Reservierung ändert den Bestand in derselben Transaktion    |
| Ändert es sich meist im selben Commit? | Ja: StockItem und Reservation ändern sich zusammen                   |
| Eigenes Team oder eigene Last?         | Ja: Das Lager bindet das alte Warenwirtschaftssystem an              |

## Entscheidung

Service `inventory` besitzt `StockItem` und `Reservation`. Er reserviert auf `OrderPlaced` und meldet
`StockReserved` oder `StockRejected`. Das Altsystem bleibt hinter einem Anti-Corruption Layer.

## Verworfen

`Reservation` beim `OrderService`: Dann hätte die Bestellung den Bestand über das Netz geändert,
und die Regel „nicht mehr reservieren als vorhanden“ wäre nicht mehr in einer Transaktion gelaufen.
