# Tomato Customer Map V2

Dashboard Leaflet per la geolocalizzazione dei clienti Tomato.

## Funzionalità
- Sidebar con KPI
- Ricerca full-text su nome locale, cliente, ragione sociale, via, comune, provincia e P.IVA
- Filtri dinamici per stato, provincia e comune
- Popup professionali con indirizzo, ragione sociale, P.IVA e numero sedi
- Pulsanti per Google Maps e copia indirizzo
- Cluster marker
- Compatibile con `data/customers.json`

## Dati attesi
Il file `data/customers.json` deve includere almeno questi campi:
- `Nome Locale`
- `Nome Cliente`
- `Ragione sociale`
- `P.IVA`
- `N° Sedi`
- `VIA`
- `col_9` (comune)
- `PROVINCIA`
- `status`
- `lat`
- `lng`

## Deploy
Pubblica il repository su GitHub Pages e lascia attivo il file `data/customers.json` generato da n8n.
