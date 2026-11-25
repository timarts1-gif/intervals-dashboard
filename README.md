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
| **Coach** | CTL, ATL, Form, ramp rate, load per 7 dagen (4 blokken) en verandering t.o.v. 28 dagen geleden per gecoachte atleet, met grafiek; ook te delen via `/share/` |
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
4. Stel de toegang in (zie [Toegang en wachtwoorden](#toegang-en-wachtwoorden)): minimaal `SESSION_SECRET` en `OWNER_PASSWORD_HASH`, of `OWNER_AUTH=off` voor alleen lokaal gebruik.

`backend/.env` staat in `.gitignore` en komt dus niet op GitHub. Zonder geldige toegangsinstellingen start de backend niet en meldt hij wat er ontbreekt.

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
│   │   ├── auth/         # sessies, wachtwoorden (bcrypt), rate limiting, rollen
│   │   ├── config/       # env.ts: configuratie uit .env
│   │   ├── middleware/   # foutafhandeling
│   │   ├── routes/       # api.ts (eigenaar), auth.ts (login), share.ts (coachoverzicht)
│   │   ├── services/     # intervalsClient.ts, coach.ts (whitelist), normalize.ts
│   │   ├── scripts/      # hash-password, gen-secret
│   │   ├── types/
│   │   ├── app.ts        # Express-app (routes, afscherming, statische bestanden)
│   │   └── index.ts      # start de server
│   ├── test/             # beveiligingstests (vitest + supertest)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/   # Layout, Sidebar, KPI-kaarten, grafieken, tabel
│   │   ├── data/         # indeling van sporttypes
│   │   ├── hooks/        # data- en instellingen-context
│   │   ├── pages/        # de pagina's van het dashboard
│   │   ├── share/        # aparte app voor de gedeelde coachpagina
│   │   ├── services/     # http.ts, api.ts (dashboard), authApi.ts (login + coach)
│   │   ├── types/
│   │   └── utils/        # aggregaties, datums, opmaak, zones
│   ├── share/index.html  # tweede entry: /share/
│   └── vite.config.ts
├── scripts/check-bundle.mjs  # controleert dat er geen geheimen in de clientbundle zitten
└── package.json          # npm workspaces + scripts
```

## Backend-API

| Endpoint | Toegang | Intervals.icu-endpoint |
| --- | --- | --- |
| `GET /api/health` | iedereen | – (alleen `{status:"ok"}`) |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | iedereen | – |
| `GET /api/share/coach` | share + eigenaar | `GET /athletes` (alleen id, naam, `icu_permission`; bij een vaste lijst `athlete-summary.json` voor de namen) en `wellness?fields=id,ctl,atl,rampRate,atlLoad` per atleet |
| `GET /api/status` | eigenaar | – |
| `GET /api/athlete` | eigenaar | `GET /api/v1/athlete/{id}` |
| `GET /api/activities?oldest=YYYY-MM-DD&newest=YYYY-MM-DD` | eigenaar | `GET /api/v1/athlete/{id}/activities` |
| `GET /api/wellness?oldest=…&newest=…` | eigenaar | `GET /api/v1/athlete/{id}/wellness` |
| `GET /api/power-curves?type=Ride` | eigenaar | `GET /api/v1/athlete/{id}/power-curves` |
| `POST /api/cache/clear` | eigenaar | – |

Antwoorden van Intervals.icu worden in het geheugen gecachet (`CACHE_TTL_SECONDS`, standaard 300).

## Toegang en wachtwoorden

Er zijn twee rollen, elk met een eigen wachtwoord:

| Rol | Ziet | Wachtwoord |
| --- | --- | --- |
| **Eigenaar** | het hele dashboard, inclusief **Coach** | `OWNER_PASSWORD_HASH` |
| **Share** (derden) | alleen `/share/` met het coachoverzicht | `SHARE_PASSWORD_HASH` |

Wachtwoorden staan alleen als bcrypt-hash in `backend/.env`. Na het inloggen krijg je een sessiecookie (`httpOnly`, `Secure`, `SameSite=Strict`, standaard 12 uur geldig). Met een share-sessie geeft elk ander API-endpoint `403`, en elke andere pagina stuurt door naar `/share/`.

### Wachtwoord instellen of wijzigen

```bash
npm run gen-secret
```

Zet de uitkomst in `backend/.env` als `SESSION_SECRET=...`. Dit hoeft maar één keer.

```bash
npm run hash-password
```

Typ het wachtwoord (minimaal 12 tekens). Zet de uitkomst, met de enkele aanhalingstekens, achter `OWNER_PASSWORD_HASH=` of `SHARE_PASSWORD_HASH=`. Herstart daarna de backend.

Een wachtwoord wijzigen doe je op dezelfde manier. Alle sessies van die rol vervallen dan meteen.

### Sessies intrekken

| Wat | Hoe |
| --- | --- |
| Alle sessies (beide rollen) | Hoog `SESSION_VERSION` op (1 → 2 → …) en herstart de backend |
| Alleen de share-sessies | Stel een nieuw share-wachtwoord in |
| Delen helemaal uitzetten | Maak `SHARE_PASSWORD_HASH` leeg en herstart |

### Welke atleten

Standaard (`COACH_ATHLETE_IDS=auto`) toont het overzicht **alle atleten waarvoor je write-toegang hebt**. De server haalt daarvoor `GET /api/v1/athletes` op en neemt de atleten met `icu_permission: WRITE`. Van elk profiel worden alleen het ID en de naam gelezen; de rest gooit de server direct weg. Een nieuwe atleet verschijnt dus vanzelf, uiterlijk na de cacheduur van 1 uur. Wil je dat sneller, gebruik dan "Cache legen" op de Settings-pagina.

Let op: de API-specificatie noemt alleen de mogelijke waarden van `icu_permission` (NONE/READ/WRITE), niet wat ze betekenen. In de praktijk is WRITE de atleet die je coacht en READ een atleet die je alleen volgt. Wil je zelf bepalen wie erin staat, geef dan een vaste lijst: `COACH_ATHLETE_IDS=i49046,i12345`. Het athlete-ID staat in de URL van het profiel van de atleet op intervals.icu.

### Wat de gedeelde pagina wel en niet bevat

- **Wel** (whitelist in `backend/src/services/coach.ts`): naam, CTL, ATL, Form (CTL − ATL), ramp rate, load per 7 dagen (4 blokken), verandering t.o.v. 28 dagen geleden, laatste datadag en de dagreeks CTL/ATL/Form.
- **Niet**: athlete-ID, e-mail, gewicht, HRV, rusthartslag, slaap, stemming/blessure, comments, activiteiten, locatie of andere profielvelden.
- **Load:** komt uit wellness-veld `atlLoad`. De API-specificatie omschrijft dat veld niet. Getest op 117 dagen: het is gelijk aan de som van `icu_training_load` per dag. Het is ook beschikbaar als activiteiten via Strava binnenkwamen, en die levert `/activities` niet.
- **Cache:** het coachoverzicht wordt 1 uur gecachet (`COACH_CACHE_TTL_SECONDS`).
- **Niet indexeren of opslaan:** responses krijgen `X-Robots-Tag: noindex`, `/robots.txt` sluit alles uit, en de data krijgt `Cache-Control: private, no-store`.

### Beveiliging controleren

```bash
npm test
```

Draait `backend/test/security.test.ts` en toont aan dat:

- (a) zonder sessie geen data te verkrijgen is;
- (b) een share-sessie geen andere route of endpoint bereikt;
- (c) het share-endpoint exact de whitelisted velden bevat;
- ook rate limiting, cookie-flags en het intrekken van sessies werken.

```bash
npm run build
```

```bash
npm run check:bundle
```

Dit toont (d) aan: er staat geen API-key, sessiegeheim of wachtwoordhash in `frontend/dist`. Heb je een `backend/.env`, dan zoekt de check ook naar de echte waarden daaruit.

## Online hosten

De backend serveert de gebouwde frontend zelf. Frontend en API staan dus op hetzelfde domein; dat is nodig voor de `SameSite=Strict`-cookie.

```bash
npm run build
```

```bash
HOST=0.0.0.0 STATIC_DIR=../frontend/dist TRUST_PROXY=1 npm start
```

Zet bij je hostingpartij de variabelen uit `.env.example` als secrets, met `OWNER_AUTH=on`. Gebruik altijd HTTPS.

**GitHub Pages is hier niet geschikt.** Pages host alleen statische bestanden en kan geen Node-backend draaien. De API-key en de wachtwoordcontrole moeten op een server staan. Een frontend op Pages met een backend ergens anders werkt ook niet: `*.github.io` is een andere site dan het domein van de backend, dus de `SameSite=Strict`-cookie wordt niet meegestuurd. Gebruik een host die een Node-proces draait.

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
