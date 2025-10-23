import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const API_BASE = 'https://agent-system-2.onrender.com/api';
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');

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
  if (hasMeta || hasScript) return { html, injected: false };
  const tag = '  <meta name="api-base" content="https://agent-system-2.onrender.com/api">';
  const reHead = /<head\b[^>]*>/i;
  if (reHead.test(html)) {
    html = html.replace(reHead, m => m + '\n' + tag);
    return { html, injected: true };
  }
  return { html, injected: false };
}

function fixRelativeLinks(html) {
  const re = /(href|src|data-src)=("|')\/(shop|product|checkout|payment-success|payment-cancel|my-orders)([^"']*)(\2)/gi;
  return html.replace(re, (m, attr, q, seg, rest) => `${attr}=${q}../${seg}${rest}${q}`);
}

async function main() {
  const targets = [path.join(PUBLIC_DIR, 'admin'), path.join(PUBLIC_DIR, 'agent')];
  let files = [];
  for (const t of targets) {
    try { files = files.concat(await listHtml(t)); } catch {}
  }
  let changed = 0, injectedCount = 0;
  for (const f of files) {
    let html;
    try { html = await fs.readFile(f, 'utf8'); } catch { continue; }
    const before = html;
    html = fixRelativeLinks(html);
    const { html: html2, injected } = ensureApiMeta(html);
    html = html2;
    if (before !== html || injected) {
      try { await fs.writeFile(f, html, 'utf8'); changed++; } catch {}
      if (injected) injectedCount++;
    }
  }
  const allHtml = await listHtml(PUBLIC_DIR);
  const dupRegex = /\b[-_.](updated|fixed|backup|old)\.html$/i;
  const duplicates = allHtml.filter(p => dupRegex.test(path.basename(p)));
  console.log(`site-fix: processed ${files.length} admin/agent HTML files`);
  console.log(`site-fix: changed=${changed}, injected_meta=${injectedCount}`);
  if (duplicates.length) {
    console.log('site-fix: duplicates (would delete):');
    for (const d of duplicates) console.log(' - ' + path.relative(ROOT, d));
  } else {
    console.log('site-fix: no duplicates found');
  }
}

main().catch(e => { console.error('site-fix error:', e?.message || e); process.exit(1); });
