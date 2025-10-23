import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import http from 'http';
import https from 'https';
import { execSync } from 'child_process';

const API_BASE = 'https://agent-system-2.onrender.com/api';
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const TMP_REPORT = path.join(os.tmpdir(), 'site-audit-report.json');

function parseRemoteUrl(remote) {
  try {
    // https://github.com/owner/repo(.git)
    let m = remote.match(/github\.com[:\/]([^\/]+)\/([^\s\.]+)(?:\.git)?/i);
    if (m) return { owner: m[1], repo: m[2] };
    // git@github.com:owner/repo(.git)
    m = remote.match(/git@github\.com:([^\/]+)\/([^\s\.]+)(?:\.git)?/i);
    if (m) return { owner: m[1], repo: m[2] };
  } catch {}
  return null;
}

function buildPagesBase() {
  let remote = '';
  try { remote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim(); } catch {}
  const parsed = parseRemoteUrl(remote);
  if (!parsed) throw new Error('Cannot determine GitHub remote. Set origin to GitHub.');
  const { owner, repo } = parsed;
  // Serve from repo root; instructions: include /public in the served path
  const base = `https://${owner}.github.io/${repo}/`;
  return base;
}

async function listHtml(dir) {
  const out = [];
  async function walk(d) {
    let entries;
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const fp = path.join(d, e.name);
      if (e.isDirectory()) await walk(fp);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.html')) out.push(fp);
    }
  }
  await walk(dir);
  return out;
}

function ensureApiMeta(html) {
  const hasMeta = /<meta\s+name=["']api-base["']\s+content=["']https:\/\/agent-system-2\.onrender\.com\/api["']\s*\/?>/i.test(html);
  const hasScript = /window\.API_BASE\s*=\s*["']https:\/\/agent-system-2\.onrender\.com\/api["']/i.test(html);
  if (hasMeta || hasScript) return { html, injected: false, present: true };
  const tag = '  <meta name="api-base" content="https://agent-system-2.onrender.com/api">';
  const reHead = /<head\b[^>]*>/i;
  if (reHead.test(html)) {
    html = html.replace(reHead, m => m + '\n' + tag);
    return { html, injected: true, present: true };
  }
  return { html, injected: false, present: false };
}

function extractRelativeLinks(html) {
  const links = new Set();
  const re = /(href|src|data-src)\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const val = (m[3] ?? m[4] ?? '').trim();
    if (!val) continue;
    const low = val.toLowerCase();
    if (low.startsWith('http://') || low.startsWith('https://') || low.startsWith('mailto:') || low.startsWith('tel:') || low.startsWith('javascript:') || low.startsWith('#')) continue;
    // Instruction: only test relative; skip absolute site-root '/...'
    if (val.startsWith('/')) continue;
    links.add(val);
  }
  return Array.from(links);
}

function resolvePageUrl(baseUrl, relFile) {
  // GH Pages path includes /public
  const norm = relFile.replace(/\\/g, '/');
  return new URL(norm, baseUrl).toString();
}

function httpRequest(method, url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.request({ method, hostname: u.hostname, path: u.pathname + u.search, protocol: u.protocol, port: u.port || (u.protocol === 'https:' ? 443 : 80), headers: { 'User-Agent': 'site-audit/1.0' } }, res => {
      resolve({ ok: res.statusCode && res.statusCode < 400, status: res.statusCode || 0 });
      res.resume();
    });
    req.on('error', () => resolve({ ok: false, status: 0 }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, status: 0 }); });
    req.end();
  });
}

async function headOrGet(url) {
  const head = await httpRequest('HEAD', url);
  if (head.ok) return { url, status: head.status };
  if (head.status === 405 || head.status === 0) {
    const get = await httpRequest('GET', url);
    return { url, status: get.status, ok: get.status > 0 && get.status < 400 };
  }
  return { url, status: head.status, ok: false };
}

async function poolAll(items, worker, limit = 10) {
  const results = [];
  let i = 0;
  const active = new Set();
  async function runOne(idx) {
    const it = items[idx];
    const p = (async () => worker(it).catch(() => null))().then(r => { results[idx] = r; active.delete(p); });
    active.add(p);
  }
  while (i < items.length) {
    while (active.size < limit && i < items.length) await runOne(i++);
    if (active.size) await Promise.race(active);
  }
  await Promise.all(active);
  return results;
}

async function main() {
  const baseUrl = buildPagesBase();
  const htmlFiles = await listHtml(PUBLIC_DIR);
  const dupRegex = /\b[-_.](updated|fixed|backup|old)\.html$/i;
  const duplicates = htmlFiles.filter(p => dupRegex.test(path.basename(p))).map(p => path.relative(ROOT, p).replace(/\\/g, '/'));

  let scanned = 0, injectedMeta = 0, totalLinks = 0;
  const brokenList = [];
  const perFile = [];

  for (const abs of htmlFiles) {
    scanned++;
    let html = '';
    try { html = await fs.readFile(abs, 'utf8'); } catch { continue; }
    const relFile = path.relative(ROOT, abs).replace(/\\/g, '/');
    const pageUrl = resolvePageUrl(baseUrl, relFile);

    const ensure = ensureApiMeta(html);
    html = ensure.html;
    if (ensure.injected) {
      injectedMeta++;
      try { await fs.writeFile(abs, html, 'utf8'); } catch {}
    }

    const links = extractRelativeLinks(html);
    totalLinks += links.length;

    const resolved = links.map(l => new URL(l, pageUrl).toString());
    const checks = await poolAll(resolved, url => headOrGet(url), 10);

    const broken = [];
    for (let idx = 0; idx < resolved.length; idx++) {
      const res = checks[idx];
      const status = res?.status ?? 0;
      const ok = status > 0 && status < 400; // Count 4xx/5xx as broken
      if (!ok) {
        const link = links[idx];
        broken.push({ link, status });
        brokenList.push({ file: relFile, link, status });
      }
    }

    perFile.push({ file: relFile, apiMetaPresent: ensure.present, metaInjected: ensure.injected, links: links.length, broken: broken.length });
  }

  const summary = {
    baseUrl,
    scannedHtml: scanned,
    injectedMeta,
    totalLinksChecked: totalLinks,
    brokenCount: brokenList.length,
    duplicates,
    perFile,
    brokenTop20: brokenList.slice(0, 20)
  };

  try { await fs.writeFile(TMP_REPORT, JSON.stringify(summary, null, 2), 'utf8'); } catch {}

  // Compact table
  console.log('SITE AUDIT REPORT');
  console.log(`Base: ${baseUrl}`);
  console.log(`HTML scanned: ${scanned} | Meta injected: ${injectedMeta} | Links checked: ${totalLinks} | Broken: ${brokenList.length}`);
  console.log('File                             Meta  Links  Broken');
  for (const r of perFile.slice(0, 50)) {
    const name = (r.file.length > 30) ? ('…' + r.file.slice(-29)) : r.file.padEnd(30, ' ');
    console.log(`${name}  ${r.apiMetaPresent ? 'Y' : 'N '}    ${String(r.links).padStart(4)}    ${String(r.broken).padStart(3)}`);
  }
  if (brokenList.length) {
    console.log('\nTop broken (max 20): file -> link -> status');
    for (const b of summary.brokenTop20) console.log(`- ${b.file} -> ${b.link} -> ${b.status}`);
  }
  if (duplicates.length) {
    console.log('\nDuplicates found:');
    for (const d of duplicates) console.log('- ' + d);
  }

  const pass = brokenList.length === 0;
  console.log(`\nRESULT: ${pass ? 'PASS' : 'FAIL'}`);
}

main().catch(e => { console.error('site-audit error:', e?.message || e); process.exit(1); });
