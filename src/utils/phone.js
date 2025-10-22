export function formatIsraeliPhone(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) clean = clean.slice(1);
  if (!clean.startsWith('972')) clean = '972' + clean;
  return clean;
}
