# ADR: Versand ist ein eigener Service

## Kontext

| Frage                                  | Antwort                                                              |
|----------------------------------------|----------------------------------------------------------------------|
| Wechselt ein Wort die Bedeutung?       | Ja: „Bestellung“ ist hier ein Paket mit Adresse, ohne Preis          |
| Müssen Regeln sofort gemeinsam gelten? | Nein: Eine Sendung entsteht erst nach der Bezahlung                  |
| Ändert es sich meist im selben Commit? | Nein: Paketdienste und Etiketten ändern sich ohne Verkaufscode       |
| Eigenes Team oder eigene Last?         | Ja: Das Versandteam deployt täglich und rechnet nachts Etiketten     |

## Entscheidung

Service `shipping` besitzt `Shipment` und `Address`. Er liest `OrderPlaced` und meldet `OrderShipped`.
Er kennt eine Bestellung nur als `orderId`, nie ihre Positionen oder Preise.

## Verworfen

`ShipmentService` als Entity-Service: Jede Sendung hätte Adresse und Positionen synchron bei zwei
anderen Services holen müssen, ein Ausfall dort hätte den Versand angehalten.
