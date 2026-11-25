# Intervals Dashboard

Development Dashboard om wielerprestaties en trainingsontwikkeling te analyseren, rechtstreeks gekoppeld aan je eigen [Intervals.icu](https://intervals.icu)-account.

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React
- **Backend:** Node.js, Express, TypeScript, native `fetch`, dotenv
- **Databron:** [Intervals.icu API](https://intervals.icu/api-docs.html) (OpenAPI-spec: `https://intervals.icu/api/v1/docs`)

De frontend praat alleen met de eigen backend. Alleen de backend kent je API-key, dus die komt nooit in de browser terecht.

## Pagina's

| Pagina | Inhoud |
| --- | --- |
| **Overview** | KPI's (uren week/maand/jaar, afstand, hoogtemeters, aantal trainingen, FTP, trainingsbelasting), volume per week, trainingsverdeling, CTL/ATL/TSB, ontwikkeling van CTL/eFTP/W/kg, recente trainingen |
| **Training** | Periodekeuze, volume en load per week/maand, tijd in vermogens- en hartslagzones, afstand/hoogtemeters, doorzoekbare en sorteerbare trainingslijst |
| **Performance** | Fitness (CTL), vermoeidheid (ATL), vorm (TSB), ramp rate, rusthartslag, HRV, gewicht, slaap |
| **Power Analysis** | Vermogenscurve (log-schaal), beste prestaties (5 s – 1 u) in W, W/kg en % FTP, NP vs. IF per rit, tijd in vermogenszones |
| **Development** | Jaar-op-jaar (YTD) vergelijking, FTP/eFTP-ontwikkeling, uren per maand per jaar, efficiency factor, aerobe decoupling, gem. NP per maand |
| **Settings** | Verbindingsstatus, sportfilter (alleen fietsen / alle sporten), hoeveel historie, cache legen, profiel en zones uit Intervals.icu |

## Installatie

Vereist: Node.js 20 of hoger en npm.

```bash
git clone https://github.com/timarts1-gif/intervals-dashboard.git
cd intervals-dashboard
npm install
```

### API-key instellen

1. Ga in Intervals.icu naar **Settings → Developer Settings** en maak een API-key aan.
2. Kopieer het voorbeeldbestand:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Vul `INTERVALS_API_KEY` in. `INTERVALS_ATHLETE_ID` mag `0` blijven (de atleet bij de API-key) of je eigen ID zijn, bijvoorbeeld `i123456`.

`backend/.env` staat in `.gitignore` en komt dus niet op GitHub.

### Starten

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000 (Vite stuurt `/api` door naar de backend)

## Projectstructuur

```
intervals-dashboard/
├── backend/
│   ├── src/
│   │   ├── config/       # env.ts: configuratie uit .env
│   │   ├── middleware/   # foutafhandeling, config-check
│   │   ├── routes/       # api.ts: /api/* endpoints
│   │   ├── services/     # intervalsClient.ts (API + cache), normalize.ts
│   │   ├── types/        # Intervals.icu-types en API-types
│   │   └── index.ts      # Express-server
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/   # Layout, Sidebar, KPI-kaarten, grafieken, tabel
│   │   ├── data/         # indeling van sporttypes
│   │   ├── hooks/        # data- en instellingen-context
│   │   ├── pages/        # de zes pagina's
│   │   ├── services/     # api.ts: aanroepen van de backend
│   │   ├── types/
│   │   └── utils/        # aggregaties, datums, opmaak, zones
│   └── vite.config.ts
└── package.json          # npm workspaces + scripts
```

## Backend-API

| Endpoint | Intervals.icu-endpoint |
| --- | --- |
| `GET /api/health` | – (status, of de key is ingesteld) |
| `GET /api/athlete` | `GET /api/v1/athlete/{id}` |
| `GET /api/activities?oldest=YYYY-MM-DD&newest=YYYY-MM-DD` | `GET /api/v1/athlete/{id}/activities` |
| `GET /api/wellness?oldest=…&newest=…` | `GET /api/v1/athlete/{id}/wellness` |
| `GET /api/power-curves?type=Ride` | `GET /api/v1/athlete/{id}/power-curves` |
| `POST /api/cache/clear` | – |

Antwoorden van Intervals.icu worden in het geheugen gecachet (`CACHE_TTL_SECONDS`, standaard 300).

## Online hosten (later)

De backend kan de gebouwde frontend zelf serveren, zodat er maar één Node-proces nodig is:

```bash
npm run build
STATIC_DIR=../frontend/dist npm start
```

Zet bij je hostingpartij de omgevingsvariabelen uit `.env.example` als secrets. Wil je frontend en backend apart hosten? Bouw de frontend dan met `VITE_API_URL=https://jouw-backend.example` en zet `CORS_ORIGIN` op de URL van de frontend.

Let op: het dashboard heeft geen login. Wie de URL kent, ziet je trainingsdata. Zet er bij online hosten dus eerst authenticatie voor.

## Definities

Alle afgeleide waarden komen rechtstreeks uit Intervals.icu:

- **CTL / ATL / TSB:** fitness, vermoeidheid en vorm uit wellness (`ctl`, `atl`; TSB = CTL − ATL).
- **eFTP:** `sportInfo[].eftp` uit wellness.
- **Training load:** `icu_training_load`.
- **IF:** `icu_intensity` / 100.
- **NP:** `icu_weighted_avg_watts`.
- **Efficiency factor:** `icu_efficiency_factor`.
- **Decoupling:** `decoupling`.

Het dashboard telt alleen op en middelt. Het berekent zelf geen fysiologische modellen.
