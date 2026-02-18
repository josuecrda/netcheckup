#!/usr/bin/env node
/**
 * Build script para NetCheckup.
 *
 * 1. Compila shared (tsc)
 * 2. Build del dashboard (vite)
 * 3. Bundlea el agent con esbuild en un solo archivo
 * 4. Copia assets necesarios al directorio de distribución
 */
import { execSync } from 'child_process';
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function run(cmd, cwd = ROOT) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function clean() {
  console.log('\n--- Limpiando dist/ ---');
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  fs.mkdirSync(DIST, { recursive: true });
}

async function buildShared() {
  console.log('\n--- 1/4 Build shared ---');
  run('npx tsc -b packages/shared');
}

async function buildDashboard() {
  console.log('\n--- 2/4 Build dashboard ---');
  run('npx vite build', path.join(ROOT, 'packages', 'dashboard'));

  // Copiar dashboard dist al paquete final
  const src = path.join(ROOT, 'packages', 'dashboard', 'dist');
  const dest = path.join(DIST, 'dashboard');
  fs.cpSync(src, dest, { recursive: true });
  console.log(`  Dashboard copiado a dist/dashboard/`);
}

async function buildAgent() {
  console.log('\n--- 3/4 Bundle agent con esbuild ---');

  await build({
    entryPoints: [path.join(ROOT, 'packages', 'agent', 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: path.join(DIST, 'agent.mjs'),
    sourcemap: true,
    minify: false, // Para debugging en producción
    // Marcar nativos como external (node los resuelve en runtime)
    external: [
      'sql.js',
      'net-snmp',
      'oui',
      'ping',
      'node-cron',
    ],
    banner: {
      js: `
import { createRequire as _cr } from 'module';
const require = _cr(import.meta.url);
`.trim(),
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  console.log('  Agent bundleado en dist/agent.mjs');
}

function copyAssets() {
  console.log('\n--- 4/4 Copiando assets ---');

  // Config por defecto
  fs.copyFileSync(
    path.join(ROOT, 'packages', 'agent', 'config.default.yaml'),
    path.join(DIST, 'config.default.yaml')
  );

  // package.json mínimo para el dist
  const pkg = {
    name: 'netcheckup',
    version: '0.1.0',
    type: 'module',
    main: 'agent.mjs',
    scripts: {
      start: 'node agent.mjs',
    },
    dependencies: {
      'sql.js': '^1.10.0',
      'net-snmp': '^3.12.0',
      'oui': '^12.0.0',
      'ping': '^0.4.4',
      'node-cron': '^3.0.3',
    },
    engines: { node: '>=20.0.0' },
  };
  fs.writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(pkg, null, 2));

  // Script de arranque multiplataforma
  fs.writeFileSync(
    path.join(DIST, 'start.sh'),
    `#!/bin/bash
# NetCheckup - Script de arranque
cd "$(dirname "$0")"
echo "Iniciando NetCheckup..."
echo "Dashboard disponible en http://localhost:7890"
node agent.mjs
`,
    { mode: 0o755 }
  );

  fs.writeFileSync(
    path.join(DIST, 'start.bat'),
    `@echo off
REM NetCheckup - Script de arranque
cd /d "%~dp0"
echo Iniciando NetCheckup...
echo Dashboard disponible en http://localhost:7890
node agent.mjs
`
  );

  // README de instalación
  fs.writeFileSync(
    path.join(DIST, 'INSTALL.txt'),
    `NetCheckup v0.1.0 - Instalación
================================

Requisitos:
  - Node.js 20 o superior (https://nodejs.org)

Instalación:
  1. Abre una terminal en esta carpeta
  2. Ejecuta: npm install
  3. Ejecuta: npm start (o node agent.mjs)
  4. Abre http://localhost:7890 en tu navegador

En macOS/Linux:
  chmod +x start.sh && ./start.sh

En Windows:
  start.bat

Para ejecutar como servicio (Linux/macOS):
  Copia netcheckup.service a /etc/systemd/system/
  systemctl enable netcheckup
  systemctl start netcheckup
`
  );

  // Systemd service file
  fs.writeFileSync(
    path.join(DIST, 'netcheckup.service'),
    `[Unit]
Description=NetCheckup - Diagnóstico de red para PyMEs
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/netcheckup
ExecStart=/usr/bin/node /opt/netcheckup/agent.mjs
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
`
  );

  console.log('  Assets copiados');
}

// ─── Main ──────────────────────────────────────────────────
async function main() {
  const start = Date.now();
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       NetCheckup — Build Pipeline        ║');
  console.log('╚══════════════════════════════════════════╝');

  clean();
  await buildShared();
  await buildDashboard();
  await buildAgent();
  copyAssets();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✓ Build completado en ${elapsed}s`);
  console.log(`  Paquete en: ${DIST}/`);
  console.log(`  Para probar: cd dist && npm install && npm start`);
}

main().catch((err) => {
  console.error('Build falló:', err);
  process.exit(1);
});
