#!/usr/bin/env node
/**
 * Empaquetado por plataforma con Node.js embebido.
 *
 * Genera ZIPs/tarballs listos para distribuir que NO requieren Node.js instalado.
 * Incluye el binario de Node.js + node_modules pre-instalado.
 *
 * Uso:
 *   node scripts/package-platform.mjs --platform=win        # Windows x64
 *   node scripts/package-platform.mjs --platform=macos      # macOS x64 + arm64
 *   node scripts/package-platform.mjs --platform=all        # las 3
 *   node scripts/package-platform.mjs --platform=win-x64    # una específica
 *
 * Prerrequisito: haber ejecutado node scripts/build.mjs
 */
import { execSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const RELEASES = path.join(ROOT, 'releases');
const CACHE_DIR = path.join(ROOT, '.cache', 'node-binaries');

// ─── Configuración de plataformas ─────────────────────────
const NODE_VERSION = '20.18.3';

const PLATFORMS = {
  'win-x64': {
    label: 'Windows x64',
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`,
    archiveFile: `node-v${NODE_VERSION}-win-x64.zip`,
    binaryInArchive: `node-v${NODE_VERSION}-win-x64/node.exe`,
    binaryName: 'node.exe',
    archiveType: 'zip',
    outputFormat: 'zip',
  },
  'macos-x64': {
    label: 'macOS Intel (x64)',
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    archiveFile: `node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    binaryInArchive: `node-v${NODE_VERSION}-darwin-x64/bin/node`,
    binaryName: 'node',
    archiveType: 'tar.gz',
    outputFormat: 'tar.gz',
  },
  'macos-arm64': {
    label: 'macOS Apple Silicon (arm64)',
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    archiveFile: `node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    binaryInArchive: `node-v${NODE_VERSION}-darwin-arm64/bin/node`,
    binaryName: 'node',
    archiveType: 'tar.gz',
    outputFormat: 'tar.gz',
  },
};

// ─── Utilidades ───────────────────────────────────────────

function run(cmd, cwd = ROOT) {
  execSync(cmd, { cwd, stdio: 'pipe' });
}

/**
 * Descarga un archivo con manejo de redirects y progreso.
 */
function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const tmpPath = destPath + '.tmp';
    const file = fs.createWriteStream(tmpPath);

    function doRequest(reqUrl) {
      https.get(reqUrl, (response) => {
        // Seguir redirects
        if ([301, 302, 307, 308].includes(response.statusCode)) {
          file.close();
          const location = response.headers.location;
          if (!location) return reject(new Error('Redirect sin Location header'));
          doRequest(location);
          return;
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(tmpPath);
          return reject(new Error(`HTTP ${response.statusCode} para ${reqUrl}`));
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (totalBytes > 0) {
            const pct = ((downloaded / totalBytes) * 100).toFixed(1);
            const mb = (downloaded / 1024 / 1024).toFixed(1);
            process.stdout.write(`\r  Descargando... ${pct}% (${mb} MB)    `);
          }
        });

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          process.stdout.write('\n');
          // Renombrar de .tmp a final (atómico)
          fs.renameSync(tmpPath, destPath);
          resolve(destPath);
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        reject(err);
      });
    }

    doRequest(url);
  });
}

/**
 * Descarga (o usa cache) el binario de Node.js para una plataforma.
 */
async function downloadNodeBinary(platformKey) {
  const platform = PLATFORMS[platformKey];
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const cachedPath = path.join(CACHE_DIR, platform.archiveFile);

  // Limpiar descargas parciales
  const tmpPath = cachedPath + '.tmp';
  if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);

  if (fs.existsSync(cachedPath)) {
    const sizeMB = (fs.statSync(cachedPath).size / 1024 / 1024).toFixed(1);
    console.log(`  Cache hit: ${platform.archiveFile} (${sizeMB} MB)`);
    return cachedPath;
  }

  console.log(`  Descargando Node.js ${NODE_VERSION} para ${platform.label}...`);
  await download(platform.url, cachedPath);
  const sizeMB = (fs.statSync(cachedPath).size / 1024 / 1024).toFixed(1);
  console.log(`  Descargado: ${sizeMB} MB`);
  return cachedPath;
}

/**
 * Extrae SOLO el binario de node del archivo descargado.
 */
function extractNodeBinary(archivePath, platformKey, destDir) {
  const platform = PLATFORMS[platformKey];
  const runtimeDir = path.join(destDir, 'runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });

  const tempExtract = path.join(CACHE_DIR, '_extract_temp');
  if (fs.existsSync(tempExtract)) fs.rmSync(tempExtract, { recursive: true });
  fs.mkdirSync(tempExtract, { recursive: true });

  try {
    if (platform.archiveType === 'zip') {
      // Windows: PowerShell Expand-Archive
      run(
        `powershell -NoProfile -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${tempExtract}' -Force"`,
      );
    } else {
      // tar.gz: funciona en Windows 10+ y macOS/Linux
      run(`tar xzf "${archivePath}" -C "${tempExtract}"`);
    }

    // Copiar solo el binario de node
    const srcBinary = path.join(tempExtract, platform.binaryInArchive);
    const destBinary = path.join(runtimeDir, platform.binaryName);

    if (!fs.existsSync(srcBinary)) {
      throw new Error(`Binario no encontrado en archivo: ${platform.binaryInArchive}`);
    }

    fs.copyFileSync(srcBinary, destBinary);
    const sizeMB = (fs.statSync(destBinary).size / 1024 / 1024).toFixed(1);
    console.log(`  Binario extraído: runtime/${platform.binaryName} (${sizeMB} MB)`);
  } finally {
    // Limpiar temp
    if (fs.existsSync(tempExtract)) {
      fs.rmSync(tempExtract, { recursive: true });
    }
  }
}

/**
 * Ensambla la carpeta de distribución para una plataforma.
 */
function buildPlatformDist(platformKey) {
  const platform = PLATFORMS[platformKey];
  const version = JSON.parse(fs.readFileSync(path.join(DIST, 'package.json'), 'utf-8')).version;
  const stagingName = `netcheckup-v${version}-${platformKey}`;
  const stagingDir = path.join(RELEASES, stagingName);

  // Limpiar staging
  if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true });
  fs.mkdirSync(stagingDir, { recursive: true });

  // Copiar archivos core
  fs.copyFileSync(path.join(DIST, 'agent.mjs'), path.join(stagingDir, 'agent.mjs'));
  if (fs.existsSync(path.join(DIST, 'agent.mjs.map'))) {
    fs.copyFileSync(path.join(DIST, 'agent.mjs.map'), path.join(stagingDir, 'agent.mjs.map'));
  }
  fs.copyFileSync(path.join(DIST, 'config.default.yaml'), path.join(stagingDir, 'config.default.yaml'));
  fs.copyFileSync(path.join(DIST, 'package.json'), path.join(stagingDir, 'package.json'));

  // Copiar dashboard
  fs.cpSync(path.join(DIST, 'dashboard'), path.join(stagingDir, 'dashboard'), { recursive: true });

  // Copiar node_modules
  fs.cpSync(path.join(DIST, 'node_modules'), path.join(stagingDir, 'node_modules'), { recursive: true });

  // Start script según plataforma
  if (platformKey === 'win-x64') {
    fs.writeFileSync(
      path.join(stagingDir, 'start.bat'),
      `@echo off\r\nREM NetCheckup - Script de arranque (Node.js incluido)\r\ncd /d "%~dp0"\r\necho Iniciando NetCheckup...\r\necho Dashboard disponible en http://localhost:7890\r\n"%~dp0runtime\\node.exe" "%~dp0agent.mjs"\r\n`
    );
  } else {
    fs.writeFileSync(
      path.join(stagingDir, 'start.sh'),
      `#!/bin/bash
# NetCheckup - Script de arranque (Node.js incluido)
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Iniciando NetCheckup..."
echo "Dashboard disponible en http://localhost:7890"
chmod +x "$DIR/runtime/node" 2>/dev/null
"$DIR/runtime/node" "$DIR/agent.mjs"
`,
      { mode: 0o755 }
    );

    // Systemd service file con ruta a runtime/node
    fs.writeFileSync(
      path.join(stagingDir, 'netcheckup.service'),
      `[Unit]
Description=NetCheckup - Diagnostico de red para PyMEs
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/netcheckup
ExecStart=/opt/netcheckup/runtime/node /opt/netcheckup/agent.mjs
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
`
    );
  }

  // INSTALL.txt actualizado
  if (platformKey === 'win-x64') {
    fs.writeFileSync(
      path.join(stagingDir, 'INSTALL.txt'),
      `NetCheckup v${version} - Instalacion (Windows x64)
================================

Node.js ya esta incluido. No necesitas instalar nada.

Uso:
  1. Extrae este ZIP en cualquier carpeta
  2. Ejecuta: start.bat (doble click)
  3. Abre http://localhost:7890 en tu navegador

Desde terminal:
  runtime\\node.exe agent.mjs
`
    );
  } else {
    const arch = platformKey === 'macos-arm64' ? 'Apple Silicon' : 'Intel';
    fs.writeFileSync(
      path.join(stagingDir, 'INSTALL.txt'),
      `NetCheckup v${version} - Instalacion (macOS ${arch})
================================

Node.js ya esta incluido. No necesitas instalar nada.

Uso:
  1. Extrae este archivo en cualquier carpeta
  2. Abre Terminal en esa carpeta
  3. Ejecuta: chmod +x start.sh runtime/node && ./start.sh
  4. Abre http://localhost:7890 en tu navegador

Para ejecutar como servicio (Linux):
  Copia netcheckup.service a /etc/systemd/system/
  Actualiza WorkingDirectory si no usas /opt/netcheckup
  systemctl enable netcheckup && systemctl start netcheckup
`
    );
  }

  console.log(`  Dist ensamblado: ${stagingName}/`);
  return stagingDir;
}

/**
 * Crea archivo comprimido (ZIP para Windows, tar.gz para macOS).
 */
function createArchive(stagingDir, outputPath, format) {
  const parentDir = path.dirname(stagingDir);
  const folderName = path.basename(stagingDir);

  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

  if (format === 'zip') {
    // Windows: PowerShell Compress-Archive
    run(
      `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${outputPath}' -Force"`,
    );
  } else {
    // tar.gz: preserva permisos de ejecución
    try {
      run(`tar czf "${outputPath}" -C "${parentDir}" "${folderName}"`);
    } catch {
      // Fallback: intentar con PowerShell si tar no está disponible
      const zipPath = outputPath.replace('.tar.gz', '.zip');
      console.log('  tar no disponible, generando .zip como fallback...');
      run(
        `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipPath}' -Force"`,
      );
      return zipPath;
    }
  }
  return outputPath;
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   NetCheckup — Platform Package (Node embebido)  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Parsear argumentos
  const args = process.argv.slice(2);
  const platformArg = args.find((a) => a.startsWith('--platform='));
  let targetPlatforms;

  if (!platformArg) {
    targetPlatforms = Object.keys(PLATFORMS);
    console.log('Sin --platform especificado, empaquetando todas las plataformas.\n');
  } else {
    const val = platformArg.split('=')[1];
    if (val === 'all') {
      targetPlatforms = Object.keys(PLATFORMS);
    } else if (val === 'win') {
      targetPlatforms = ['win-x64'];
    } else if (val === 'macos') {
      targetPlatforms = ['macos-x64', 'macos-arm64'];
    } else if (PLATFORMS[val]) {
      targetPlatforms = [val];
    } else {
      console.error(`Plataforma no reconocida: ${val}`);
      console.error(`Opciones: ${Object.keys(PLATFORMS).join(', ')}, win, macos, all`);
      process.exit(1);
    }
  }

  // Verificar que dist/ está listo
  if (!fs.existsSync(path.join(DIST, 'agent.mjs'))) {
    console.error('Error: dist/agent.mjs no encontrado.');
    console.error('Ejecuta primero: node scripts/build.mjs');
    process.exit(1);
  }
  if (!fs.existsSync(path.join(DIST, 'node_modules'))) {
    console.error('Error: dist/node_modules no encontrado.');
    console.error('Ejecuta primero: node scripts/build.mjs (incluye npm install)');
    process.exit(1);
  }

  const version = JSON.parse(fs.readFileSync(path.join(DIST, 'package.json'), 'utf-8')).version;
  fs.mkdirSync(RELEASES, { recursive: true });

  console.log(`Version: ${version}`);
  console.log(`Node.js: ${NODE_VERSION}`);
  console.log(`Plataformas: ${targetPlatforms.map((p) => PLATFORMS[p].label).join(', ')}\n`);

  const results = [];

  for (const platformKey of targetPlatforms) {
    const platform = PLATFORMS[platformKey];
    console.log(`\n┌── ${platform.label} ──`);

    // 1. Descargar Node.js
    const archivePath = await downloadNodeBinary(platformKey);

    // 2. Ensamblar dist
    const stagingDir = buildPlatformDist(platformKey);

    // 3. Extraer binario de Node al staging
    extractNodeBinary(archivePath, platformKey, stagingDir);

    // 4. Crear archivo comprimido
    const ext = platform.outputFormat === 'zip' ? '.zip' : '.tar.gz';
    const archiveName = `netcheckup-v${version}-${platformKey}${ext}`;
    const archivePath2 = path.join(RELEASES, archiveName);

    console.log(`  Comprimiendo: ${archiveName}...`);
    const finalPath = createArchive(stagingDir, archivePath2, platform.outputFormat);

    // 5. Limpiar staging
    fs.rmSync(stagingDir, { recursive: true });

    // 6. Reportar
    const stat = fs.statSync(finalPath);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
    console.log(`  ✓ ${path.basename(finalPath)}: ${sizeMB} MB`);
    results.push({ platform: platform.label, file: path.basename(finalPath), size: sizeMB });

    console.log(`└── ${platform.label} listo`);
  }

  // Resumen
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║                    Resumen                        ║');
  console.log('╠══════════════════════════════════════════════════╣');
  for (const r of results) {
    console.log(`║  ${r.platform.padEnd(28)} ${r.size.padStart(8)} MB  ║`);
  }
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\nPaquetes en: ${RELEASES}/`);
  console.log(`Tiempo total: ${elapsed}s`);
  console.log('\nDistribución: el usuario extrae y ejecuta start.bat / start.sh');
  console.log('No requiere Node.js ni npm instalado.');
}

main().catch((err) => {
  console.error('Empaquetado falló:', err);
  process.exit(1);
});
