import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

// Linux x64 validation binaries only. No root, package-manager changes, or default-browser changes.
if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('This helper supports Linux x64. Use installed Chrome/Edge on other systems.');
const directory = process.env.SPACE_BROWSER_DIR || '/tmp/opencode/space-browsers';
await mkdir(directory, { recursive: true });
const manifest = {};
for (const [name, root, packageName, executable] of [
  ['chrome', 'https://dl.google.com/linux/chrome/deb/', 'google-chrome-stable', 'opt/google/chrome/chrome'],
  ['edge', 'https://packages.microsoft.com/repos/edge/', 'microsoft-edge-stable', 'opt/microsoft/msedge/msedge'],
]) {
  const metadataResponse = await fetch(`${root}dists/stable/main/binary-amd64/Packages.gz`);
  if (!metadataResponse.ok) throw new Error(`Metadata download failed: ${metadataResponse.status}`);
  const metadata = gunzipSync(Buffer.from(await metadataResponse.arrayBuffer())).toString();
  const versions = metadata.split('\n\n').map((entry) => Object.fromEntries(entry.split('\n').filter((line) => /^[\w-]+: /.test(line)).map((line) => {
    const colon = line.indexOf(': ');
    return [line.slice(0, colon), line.slice(colon + 2)];
  }))).filter((entry) => entry.Package === packageName && entry.Architecture === 'amd64')
    .sort((a, b) => b.Version.localeCompare(a.Version, undefined, { numeric: true }));
  const selected = versions[0];
  if (!selected?.SHA256 || !selected.Filename) throw new Error(`No stable package metadata found for ${name}`);
  const destination = resolve(directory, `${name}-${selected.Version}`);
  const binary = resolve(destination, executable);
  if (!existsSync(binary)) {
    console.log(`Downloading ${name} ${selected.Version} from its official stable repository`);
    const response = await fetch(new URL(selected.Filename, root));
    if (!response.ok) throw new Error(`Browser download failed: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== selected.SHA256) throw new Error(`${name} package hash mismatch`);
    await mkdir(destination, { recursive: true });
    const archive = resolve(destination, 'browser.deb');
    await writeFile(archive, bytes);
    const listing = spawnSync('ar', ['t', archive], { encoding: 'utf8' });
    if (listing.status !== 0) throw new Error(listing.stderr || 'Could not read Debian archive');
    const data = listing.stdout.split('\n').find((line) => /^data\.tar\.(xz|gz|zst)$/.test(line));
    if (!data) throw new Error('No supported data archive in browser package');
    const contents = spawnSync('ar', ['p', archive, data], { maxBuffer: 400 * 1024 * 1024 });
    if (contents.status !== 0) throw new Error('Could not extract Debian data archive');
    const compression = data.endsWith('.xz') ? '-J' : data.endsWith('.gz') ? '-z' : '--zstd';
    const unpack = spawnSync('tar', ['-x', compression, '-f', '-', '-C', destination], { input: contents.stdout });
    if (unpack.status !== 0) throw new Error(unpack.stderr.toString());
  }
  manifest[name] = { executablePath: binary, version: selected.Version, sha256: selected.SHA256, source: new URL(selected.Filename, root).href };
}
await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Validation browser manifest: ${resolve(directory, 'manifest.json')}`);
