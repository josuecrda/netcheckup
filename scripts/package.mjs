#!/usr/bin/env node
/**
 * Script de empaquetado para distribución.
 *
 * Genera archivos ZIP listos para distribuir:
 *   - netcheckup-v0.1.0-universal.zip (requiere Node.js instalado)
 *
 * Uso: node scripts/package.mjs
 * Prerrequisito: haber ejecutado node scripts/build.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const RELEASES = path.join(ROOT, 'releases');

function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     NetCheckup — Package for Release     ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Verificar que dist existe
  if (!fs.existsSync(path.join(DIST, 'agent.mjs'))) {
    console.error('Error: dist/agent.mjs no encontrado. Ejecuta primero: node scripts/build.mjs');
    process.exit(1);
  }

  // Crear carpeta releases
  if (fs.existsSync(RELEASES)) {
    fs.rmSync(RELEASES, { recursive: true });
  }
  fs.mkdirSync(RELEASES, { recursive: true });

  // Leer versión del package.json del dist
  const pkg = JSON.parse(fs.readFileSync(path.join(DIST, 'package.json'), 'utf-8'));
  const version = pkg.version;
  const zipName = `netcheckup-v${version}-universal`;

  console.log(`Versión: ${version}`);
  console.log(`Empaquetando: ${zipName}.zip\n`);

  // Crear ZIP
  try {
    // Usar tar en macOS/Linux, o powershell en Windows
    if (process.platform === 'win32') {
      execSync(
        `powershell -Command "Compress-Archive -Path '${DIST}\\*' -DestinationPath '${path.join(RELEASES, zipName)}.zip'"`,
        { stdio: 'inherit' }
      );
    } else {
      execSync(
        `cd "${DIST}" && zip -r "${path.join(RELEASES, zipName)}.zip" . -x "node_modules/*"`,
        { stdio: 'inherit' }
      );
    }
    console.log(`\n✓ Paquete creado: releases/${zipName}.zip`);
  } catch (err) {
    // Fallback: crear tar.gz
    console.log('zip no disponible, creando .tar.gz...');
    execSync(
      `cd "${DIST}" && tar -czf "${path.join(RELEASES, zipName)}.tar.gz" --exclude='node_modules' .`,
      { stdio: 'inherit' }
    );
    console.log(`\n✓ Paquete creado: releases/${zipName}.tar.gz`);
  }

  // Mostrar contenido
  const files = fs.readdirSync(RELEASES);
  for (const f of files) {
    const stat = fs.statSync(path.join(RELEASES, f));
    const sizeMb = (stat.size / 1024 / 1024).toFixed(2);
    console.log(`  ${f} (${sizeMb} MB)`);
  }

  console.log(`\nDistribución:
  1. El usuario descarga y descomprime el ZIP
  2. Abre terminal en la carpeta
  3. Ejecuta: npm install
  4. Ejecuta: npm start (o ./start.sh / start.bat)
  5. Abre http://localhost:7890
`);
}

main();
