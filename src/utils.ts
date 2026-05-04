import { Token } from './types.js';

export const ALIASES: Record<string, string> = {
  form: 'text', upostag: 'pos', xpostag: 'cpos',
  feats: 'morph', deprel: 'func', deps: 'head2', misc: 'func2',
  xpos: 'cpos', upos: 'pos',
};

export function getField(token: Token, field: string): any {
  const f = ALIASES[field] || field;
  // @ts-ignore
  return token[f]?? '';
}

export function setField(token: Token, field: string, value: string) {
  const f = ALIASES[field] || field;
  // @ts-ignore
  if (f === 'edep') {
    if (!value || value === '_' ) {
      token.edep = [];
    } else if (value === 'root') {
      token.edep = [['0','root']];
    } else {
      token.edep = value.split('|').map(p => {
        const [h,d] = p.split(':',2);
        return [h||'', d||''] as [string,string];
      });
    }
    return;
  }
  // @ts-ignore
  token[f] = value;
}

export function testRelation(t1: Token, t2: Token, op: string): boolean {
  if (op === '>') return t1.id === t2.head;
  if (op === '~') return t2.edep.some(([h]) => h === t1.id);
  if (op === '.') return parseInt(t2.id) === parseInt(t1.id) + 1;
  if (op === '.*') return parseInt(t2.id) > parseInt(t1.id);
  const m = op.match(/^\.([0-9]+)(?:,([0-9]+))?$/);
  if (m) {
    const min = parseInt(m[1]);
    const max = m[2]? parseInt(m[2]) : min;
    const dist = parseInt(t2.id) - parseInt(t1.id);
    return dist >= min && dist <= max;
  }
  return false;
}