import { franc } from 'franc-min';

export function detectLang(text: string): string {
  const sample = text.slice(0, 2000);
  const result = franc(sample);
  if (result === 'cmn' || result === 'zho') return 'zh';
  if (result === 'eng') return 'en';
  return result === 'und' ? 'unknown' : result;
}
