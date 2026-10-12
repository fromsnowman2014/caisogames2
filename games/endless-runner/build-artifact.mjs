/**
 * Build the Artifact-hosted copies of the game from src/index.html.
 *
 * The Artifact host wraps whatever it is given in its own
 * `<!doctype html><head>…</head><body>` skeleton, so the published file must
 * NOT carry document scaffolding of its own. This script strips it, leaving
 * the <title>, <style>, markup and scripts.
 *
 * Two builds, because the platform refuses to combine the `db` capability with
 * public sharing:
 *
 *   turbo-dash.html        - no db. Publishable as a public, shareable link.
 *                            The leaderboard falls back to this device's own
 *                            best, which the game is written to handle.
 *   turbo-dash-cloud.html  - published WITH capabilities {db:{}} for the live
 *                            shared leaderboard. Stays organization-internal.
 *
 * Usage:  node build-artifact.mjs [outDir]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src', 'index.html');
const outDir = process.argv[2] || path.join(HERE, 'src');

const DROP = new Set([
  '<!DOCTYPE html>', '<html lang="en">', '<head>', '</head>',
  '<body>', '</body>', '</html>'
]);

function build(title) {
  const src = fs.readFileSync(SRC, 'utf8');
  const kept = src.split('\n').filter(line => {
    const t = line.trim();
    if (DROP.has(t)) return false;
    // The host supplies charset and viewport; ours would be inert in <body>.
    if (t.startsWith('<meta ')) return false;
    if (t.startsWith('<!-- viewport-fit') || t.startsWith('stops double-tap')) return false;
    return true;
  });

  let out = kept.join('\n')
    .replace(/<title>[^<]*<\/title>/, '<title>' + title + '</title>');
  while (out.indexOf('\n\n\n') >= 0) out = out.split('\n\n\n').join('\n\n');
  out = out.replace(/^\s+/, '');

  // Guard the invariants rather than trusting the filter above.
  for (const tag of ['<!DOCTYPE', '<html', '<head>', '<body>', '</html>']) {
    if (out.indexOf(tag) >= 0) throw new Error('scaffolding survived: ' + tag);
  }
  if (out.indexOf('<title>' + title + '</title>') !== 0 &&
      out.indexOf('<title>' + title + '</title>') < 0) {
    throw new Error('title not set');
  }
  return out;
}

const targets = [
  ['turbo-dash.html', 'Turbo Dash'],
  ['turbo-dash-cloud.html', 'Turbo Dash Arena']
];

for (const [file, title] of targets) {
  const html = build(title);
  fs.writeFileSync(path.join(outDir, file), html);
  console.log(file.padEnd(24), title.padEnd(18), html.length + ' bytes');
}

// Keep the in-repo reference copy in step with the public build.
fs.writeFileSync(path.join(HERE, 'src', 'artifact-build.html'), build('Turbo Dash'));
console.log('artifact-build.html      (repo reference copy)');
