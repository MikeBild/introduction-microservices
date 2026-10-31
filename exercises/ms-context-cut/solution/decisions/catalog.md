# ADR: Katalog ist ein eigener Service

## Kontext

| Frage                                  | Antwort                                                            |
|----------------------------------------|--------------------------------------------------------------------|
| Kippt an der Grenze ein Wort?          | Ja: „Product“ ist hier Name, Beschreibung und Preis, kein Bestand  |
| Müssen Regeln sofort gemeinsam gelten? | Nein: Eine Bestellung friert den Preis zum Zeitpunkt ein           |
| Ändert es sich meist im selben Commit? | Nein: Preise und Texte ändern sich ohne Bestellcode                |
| Eigenes Team oder eigene Last?         | Ja: Der Katalog wird tausendfach gelesen, selten geschrieben       |

## Entscheidung

Service `catalog` besitzt `Product` und `Price`. Der Verkauf fragt Preise synchron per HTTP ab
(`GET /products/:id`) und speichert sie in der Position. Niemand liest die Tabelle `products` direkt.

## Verworfen

`ProductService` mit Preis und Bestand: Zwei Sprachen in einem Modell, und jede Reservierung hätte
den Lesecache des Katalogs mit Schreiblast belegt.
