# Studieplanner

Week- en studieplanner voor laptop en gsm. Installeerbaar als app (PWA), werkt offline. Alle gegevens blijven op het toestel (IndexedDB, met localStorage als terugval).

## Gebruiken

- **Blok maken**: dubbelklik op een lege plek, of klik en sleep over een bereik. Op gsm: lang indrukken (en slepen).
- **Verplaatsen**: blok slepen (ook naar een andere dag). **Duur**: onderrand slepen.
- **Toetsenbord**: Tab naar een blok, Enter opent, pijl omhoog/omlaag verplaatst 15 min, links/rechts een dag, Shift+pijl wijzigt de duur.
- **Lijsten**: klik toont de inhoud, slepen naar de planner maakt een blok met checklist.
- **TimeEdit**: Instellingen → Importeer .ics. Een nieuwe import vervangt de vorige; eigen blokken blijven.
- **Back-up**: Instellingen → Exporteren / Importeren (JSON).

Installeren op gsm: open de site in Chrome (Android) of Safari (iPhone) en kies "Toevoegen aan startscherm".

## Ontwikkelen

```bash
npm install
npm run dev        # lokale server
npm test           # unit-tests (Vitest)
npm run check      # typecontrole
npm run e2e        # end-to-end (Playwright, desktop + gsm)
```

`tests/fixtures/rooster-anon.ics` is een geanonimiseerde kopie van een echt TimeEdit-rooster (zonder naam, studentennummer en lesgevers). Een eigen `tests/fixtures/rooster.ics` wordt genegeerd door git en heeft voorrang in de tests.

## Opbouw

- `src/lib/` – logica zonder interface: datums, kwartieren, tijdzone, overlap, herhaling, teller, ICS-import, migratie, opslag
- `src/components/` – Svelte-componenten
- `src/actions/` – slepen met muis en vinger
- Datamodel heeft een `schemaVersion`; `migrate()` zet oudere gegevens (ook een back-up van het eerste prototype) om zonder iets te wissen.
