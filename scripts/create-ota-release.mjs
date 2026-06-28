#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const distDir = join(rootDir, 'dist');
const releaseDir = join(rootDir, '.ota-releases');

const args = process.argv.slice(2);

const readOption = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
};

const hasFlag = name => args.includes(`--${name}`);

const channel = readOption('channel', 'production').toLowerCase();
const platform = readOption('platform', 'android').toLowerCase();
const notes = readOption('notes', '');
const rollout = Number(readOption('rollout', '0'));
const minNativeVersionCode = Number(readOption('min-native-version-code', '14'));
const mandatory = hasFlag('mandatory');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pxjvltgarzvoptdfdkxq.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. This script needs service-role access to upload OTA bundles and publish releases.');
  process.exit(1);
}

if (!Number.isFinite(rollout) || rollout < 0 || rollout > 100) {
  console.error('--rollout must be a number between 0 and 100.');
  process.exit(1);
}

if (!Number.isFinite(minNativeVersionCode) || minNativeVersionCode < 1) {
  console.error('--min-native-version-code must be a positive number.');
  process.exit(1);
}

if (!existsSync(join(distDir, 'index.html'))) {
  console.error('dist/index.html was not found. Run npm run build before publishing an OTA release.');
  process.exit(1);
}

const run = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? rootDir,
    stdio: options.stdio ?? 'pipe',
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`${command} ${commandArgs.join(' ')} failed\n${output}`);
  }

  return typeof result.stdout === 'string' ? result.stdout.trim() : '';
};

const gitSha = run('git', ['rev-parse', '--short', 'HEAD']) || 'nogit';
const now = new Date();
const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 12);
const version = readOption('version', `ota-${stamp}-${gitSha}`);
const zipName = `${version}.zip`;
const zipPath = join(releaseDir, zipName);
const bundlePath = `${platform}/${channel}/${zipName}`;

mkdirSync(releaseDir, { recursive: true });
rmSync(zipPath, { force: true });

const distEntries = await readdir(distDir);
run('zip', ['-r', zipPath, ...distEntries], { cwd: distDir, stdio: 'inherit' });

const checksum = createHash('sha256').update(readFileSync(zipPath)).digest('hex');
const zipSizeMb = (statSync(zipPath).size / 1024 / 1024).toFixed(2);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const uploadBody = readFileSync(zipPath);
const { error: uploadError } = await supabase.storage
  .from('ota-bundles')
  .upload(bundlePath, uploadBody, {
    contentType: 'application/zip',
    upsert: true,
  });

if (uploadError) {
  console.error('OTA bundle upload failed:', uploadError.message);
  process.exit(1);
}

const { error: releaseError } = await supabase
  .from('ota_releases')
  .upsert({
    version,
    channel,
    platform,
    min_native_version_code: minNativeVersionCode,
    bundle_path: bundlePath,
    checksum,
    enabled: true,
    mandatory,
    rollout_percent: rollout,
    notes: notes || null,
  }, {
    onConflict: 'version,channel,platform',
  });

if (releaseError) {
  console.error('OTA release publish failed:', releaseError.message);
  process.exit(1);
}

console.log('');
console.log('OTA release published');
console.log(`Version: ${version}`);
console.log(`Channel: ${channel}`);
console.log(`Platform: ${platform}`);
console.log(`Rollout: ${rollout}%`);
console.log(`Min native version code: ${minNativeVersionCode}`);
console.log(`Bundle: ota-bundles/${bundlePath}`);
console.log(`Zip: ${basename(zipPath)} (${zipSizeMb} MB)`);
console.log(`SHA-256: ${checksum}`);
