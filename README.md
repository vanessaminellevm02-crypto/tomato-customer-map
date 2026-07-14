# Tomato Customer Map

Dashboard geografica interattiva per visualizzare i clienti Tomato.

## Stati
- ATTIVO: verde
- INATTIVO: rosso
- STAND BY: arancione
- PAY: esclusi

## Struttura
- `index.html`: pagina
- `style.css`: grafica
- `app.js`: logica mappa
- `data/customers.json`: database pubblico minimo

## Pubblicazione con GitHub Pages
Dopo aver caricato i file:
1. Repository → Settings → Pages
2. Build and deployment → Source: Deploy from a branch
3. Branch: `main`, cartella: `/ (root)`
4. Save

## Aggiornamento con n8n
n8n dovrà generare/sostituire `data/customers.json`.
Non pubblicare P.IVA, valori di rinnovo, note o altri dati riservati.
