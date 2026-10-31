# ADR: <Context> ist ein eigener Service

Leg je Context eine Datei `decisions/<context>.md` an, der Name ist der Schlüssel aus `contextMap.contexts`.

## Kontext

Welche Antworten gibt der Schnitt-Check? Welches Wort kippt hier, welche Regeln müssen sofort
gemeinsam gelten, was ändert sich meist zusammen, gibt es ein eigenes Team oder eine eigene Last?

| Frage                                  | Antwort |
|----------------------------------------|---------|
| Kippt an der Grenze ein Wort?          |         |
| Müssen Regeln sofort gemeinsam gelten? |         |
| Ändert es sich meist im selben Commit? |         |
| Eigenes Team oder eigene Last?         |         |

## Entscheidung

Welche Entities besitzt der Context, welche Kanten hat er zu anderen (http, events), und was liest er nie?

## Verworfen

Welche Alternative war im Vorschlag, und warum nicht?
