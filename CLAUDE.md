# NetCheckup — Contexto del Proyecto

## Qué es NetCheckup
Herramienta de monitoreo y diagnóstico de red para PyMEs. Detecta automáticamente dispositivos, mide latencia/velocidad, diagnostica problemas y genera reportes. Modelo freemium con 3 tiers.

## Monorepo (npm workspaces)
```
packages/
  shared/    → Tipos TypeScript y constantes compartidas
  agent/     → Backend Node.js (Express + WebSocket + SQLite)
  dashboard/ → Frontend React (Vite + Tailwind + TanStack Query)
  landing/   → Landing page estática HTML
```

## Tech Stack
- **Agent**: Node.js 20, TypeScript strict, Express 4.x, ws, sql.js (WebAssembly SQLite), node-cron, net-snmp
- **Dashboard**: React 18, Vite 5.0.13, Tailwind CSS (dark theme), TanStack React Query, Recharts
- **DB**: sql.js (NO better-sqlite3 — evita compilación nativa). Schema version 2.
- **Ports**: Agent = 7890, Dashboard dev = 5173

## Build & Run
```bash
# Build shared (PRIMERO — otros packages dependen de esto)
npx tsc -p packages/shared/tsconfig.json

# Build agent
npx tsc -p packages/agent/tsconfig.json
cp packages/agent/src/db/schema.sql packages/agent/dist/db/schema.sql

# Build dashboard
npm run build:dashboard

# Run agent (port 7890)
node packages/agent/dist/index.js

# Run dashboard dev (port 5173, proxy API → 7890)
cd packages/dashboard && node dev.mjs

# Kill port si EADDRINUSE
npx --yes kill-port 7890

# Empaquetar para distribución
npm run dist:win    # Windows
npm run dist:macos  # macOS
npm run dist:all    # ambos
```

## Estado de Fases — TODAS COMPLETAS

### Phase 1: Scaffolding
Estructura del monorepo, configuraciones, dependencias, tipos base.

### Phase 2: Dashboard
Todas las páginas (Dashboard, Dispositivos, DeviceDetail, Alertas, Velocidad, Reportes, Configuración), componentes, routing, WebSocket para updates en tiempo real.

### Phase 3: Motor de Diagnóstico
Health score, detección de problemas con 16 reglas, recomendaciones automáticas, auto-resolve.

### Phase 4: Herramientas + Polish
1. **Network toolkit**: 7 herramientas (Ping, Traceroute, DNS, Port Scanner, WoL, Subnet Calc, SNMP Query)
2. **Onboarding wizard**: 4 pasos (Welcome → Company → ISP → Scan)
3. **Packaging**: Binarios embebidos para Windows/macOS (`scripts/package-platform.mjs`)
4. **Freemium licensing**: 3 tiers (Gratuito/$299/$799 MXN), validación offline HMAC-SHA256
5. **Landing page**: HTML estática en `packages/landing/`

### Phase 5: Diagnóstico Avanzado de Switches (SNMP)
- **SNMP Poller** (`scanners/snmp-poller.ts`): Polls MIB-II, EtherLike-MIB, ifXTable cada 5 min
- **6 reglas de diagnóstico** (`analyzers/rules/switch-port-rules.ts`):
  - port-error-rate-high, duplex-mismatch, port-saturated, speed-mismatch, crc-errors-physical, port-discards-buffer
- **Repo de contadores** (`db/repositories/snmp-counter.repo.ts`): Deltas, top talkers, port health
- **DB migration v2**: Tabla `snmp_interface_counters`
- **API**: `GET /api/snmp/port-health`, `GET /api/snmp/top-talkers` (gateado con `canUseSnmp()`)
- **Dashboard**: Tab "Salud de Puertos" en ToolsPage con barras de utilización, errores, top talkers
- **Todo gateado** detrás del tier Consultoría

## DB Schema (version 2)
- v1: devices, scans, metrics, speed_tests, health_scores, problems, alerts, settings, app_metadata
- v2: + snmp_interface_counters (snapshots de contadores SNMP por interfaz)

## Patrones de Arquitectura
- **Settings**: key-value en SQLite (`settings` table, `key TEXT PRIMARY KEY, value TEXT`)
- **API responses**: `{ success, data, timestamp }` — dashboard extrae `.data` automáticamente via `request<T>()`
- **Tailwind theme**: `bg-surface-dark` (page bg), `bg-surface` (cards), `bg-surface-light` (hover), `text-accent` (brand blue)
- **Reglas de diagnóstico**: Interface `DiagnosticRule` con `evaluate(ctx)` → `RuleResult | RuleResult[] | null`
- **Auto-resolve**: Problemas que ya no se detectan se resuelven automáticamente
- **License tiers**: `TIER_LIMITS` en `packages/shared/src/constants.ts`
- **Network guard**: Detecta cambios de subred, pausa scheduler, muestra banner en dashboard

## Licensing/Enforcement
- Backend: 403 guards en PDF reports, SNMP tools, scheduled reports
- Frontend: Lock icons + mensajes de upgrade en Reports y SNMP/PortHealth
- Data retention cleanup: Cron diario 3am borra datos viejos según tier
- `packages/agent/src/license.ts`: `canUsePdfReports()`, `canUseSnmp()`, `canRunDiscoveryScan()`, etc.

## Bug Fixes Importantes
- **Speed test**: Valores ~6x bajos (usaba totalBytes/totalElapsed incluyendo delays de animación)
- **DNS lookup**: Fallback a `dns.lookup` cuando `dns.resolve4` da ECONNREFUSED
- **Onboarding**: Bug de closure (scanDone capturado como false), memory leak (polling interval no limpiado)

## Preferencias del Usuario
- **Usuario**: Josue (Optima Energía)
- **Idioma**: Español (toda la UI en español)
- **Estilo**: "No me pidas permiso, solo hazlo" — proceder autónomamente
- **IMPORTANTE**: Evitar paquetes npm nativos que necesiten node-gyp (no hay Python instalado)

## Posibles Siguientes Pasos
- Testing con switches SNMP reales para validar reglas de diagnóstico
- Integración de notificaciones Email/Telegram (backend existe, UI toggles no conectados)
- Reglas adicionales de diagnóstico basadas en uso real
- Optimización de performance (code splitting para dashboard)
- CI/CD pipeline
