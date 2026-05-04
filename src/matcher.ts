import { Token } from './types.js';
import { getField } from './utils.js';

export class DefinitionMatcher {
  conditions: Array<{field: string, regex: RegExp, neg: boolean}> = [];
  sent_def = false;
  groups: string[] = [];

  constructor(public def_index: number, defStr: string) {
    const parts = defStr.split('&');
    for (let p of parts) {
      p = p.trim();
      let neg = false;
      if (p.startsWith('!')) { neg = true; p = p.slice(1); }
      const m = p.match(/^#?\d*:?([^!=]+)(!?=)\/(.+)\/$/);
      if (!m) continue;
      const field = m[1];
      const op = m[2];
      let pattern = m[3];
      const isNeg = op === '!=' || neg;
      try {
        let flags = '';
        if (pattern.startsWith('(?i)')) {
          pattern = pattern.slice(4);
          flags = 'i';
        } else if (pattern.includes('(?i)')) {
          pattern = pattern.replace(/\(\?i\)/g, '');
          flags = 'i';
        }
        this.conditions.push({field, regex: new RegExp(pattern, flags), neg: isNeg});
      } catch {}
    }
    if (defStr.includes('#S:')) this.sent_def = true;
  }

  match(token: Token): boolean {
    this.groups = [];
    for (const c of this.conditions) {
      const val = String(getField(token, c.field)?? '');
      const match = c.regex.exec(val);
      const ok = c.neg?!match :!!match;
      if (!ok) return false;
      if (match) {
        for (let i = 1; i < match.length; i++) this.groups.push(match[i]?? '');
      }
    }
    return true;
  }
}