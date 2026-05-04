import { Token, Sentence } from './types.js';
import { getField, setField, testRelation } from './utils.js';
import { Transformation } from './transformation.js';

export class DepEditEngine {
  transformations: Transformation[] = [];
  variables: Record<string, string> = {};

  addVariable(key: string, val: string) {
    this.variables[key] = val;
  }

  loadIniString(ini: string) {
  // strip ALL control characters except \t and \n
    const clean = ini.replace(/[^\x09\x0A\x20-\x7E]/g, '');
    const lines = clean.split('\n');
    for (let raw of lines) {
      let line = raw.trim();
      if (!line || line.startsWith(';')) continue;
      if (line.startsWith('#') && !line.startsWith('#S:')) continue;
      const varMatch = line.match(/^\{\$([^}]+)\}=\/(.+)\/$/);
      if (varMatch) {
        this.addVariable(varMatch[1], varMatch[2]);
        continue;
      }
      for (const [k,v] of Object.entries(this.variables)) {
        line = line.replace(new RegExp(`\\{\\$${k}\\}`, 'g'), v);
      }
      if (!line.includes('\t')) continue;
      const [def, rel, act] = line.split('\t').map(s => s.trim());
      this.transformations.push(new Transformation(`${def}\t${rel}\t${act}`));
    }
  }

  parseConllu(input: string): Sentence[] {
    const sentences: Sentence[] = [];
    const blocks = input.trim().split(/\n\s*\n/);
    for (const block of blocks) {
      const lines = block.split('\n');
      const sent: Sentence = {tokens: [], annotations: {}, input_annotations: {}, docname: ''};
      for (const l of lines) {
        if (l.startsWith('#')) {
          const m = l.match(/^#\s*([^=]+)=\s*(.*)$/);
          if (m) sent.input_annotations[m[1].trim()] = m[2].trim();
          continue;
        }
        const cols = l.split('\t');
        if (cols.length < 10) continue;
        const [id, text, lemma, pos, cpos, morph, head, func, head2, func2] = cols;
        const token: Token = {
          id, num: parseFloat(id), text, lemma, pos, cpos, morph, head, func,
          head2, func2,
          edep: [],
          storage: '', storage2: '', storage3: '',
          child_funcs: [],
          position: 'middle',
          is_super_tok: id.includes('-'),
          sentence: sent,
        };
        if (head2 && head2 !== '_' && head2.includes(':')) {
          token.edep = head2.split('|').map(p=>{ const [h,d]=p.split(':',2); return [h,d] as [string,string]; });
        }
        sent.tokens.push(token);
      }
      if (sent.tokens.length) {
        sent.tokens.forEach((t,i)=> t.position = i===0?'first': i===sent.tokens.length-1?'last':'middle');
        sentences.push(sent);
      }
    }
    return sentences;
  }

  serialize(sentences: Sentence[]): string {
    const out: string[] = [];
    for (const sent of sentences) {
      for (const [k,v] of Object.entries(sent.input_annotations)) out.push(`# ${k} = ${v}`);
      for (const [k,v] of Object.entries(sent.annotations)) out.push(`# ${k} = ${v}`);
      for (const t of sent.tokens) {
        // rebuild head2 from edep if needed
        if (t.edep.length) {
          t.head2 = t.edep.map(([h,d])=>`${h}:${d}`).join('|');
        }
        out.push([t.id, t.text, t.lemma, t.pos, t.cpos, t.morph, t.head, t.func, t.head2||'_', t.func2||'_'].join('\t'));
      }
      out.push('');
    }
    return out.join('\n');
  }

  apply(sentence: Sentence) {
    for (const tr of this.transformations) {
      // find matches for definitions
      const nodeMatches: Record<number, {token: Token, groups: string[]}[]> = {};
      tr.definitions.forEach((def,i)=>{
        const idx = i+1;
        nodeMatches[idx] = sentence.tokens.filter(t=>def.match(t)).map(t=>({token:t, groups:[...def.groups]}));
      });

      // simple backtracking for relations
      const results: any[] = [];
      const dfs = (pos: number, assign: Record<number, Token>, groups: string[]) => {
        if (pos > tr.definitions.length) {
          // check relations
          for (const rel of tr.relStrs) {
            if (rel==='none' || !rel) continue;
            // parse chain like #1>#2>#3 or #1.1,50#3
            const parts: string[] = [];
            let lastIdx = 0;
            const re = /#\d+/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(rel)) !== null) {
              if (m.index > lastIdx) {
                parts.push(rel.slice(lastIdx, m.index));
              }
              parts.push(m[0]);
              lastIdx = re.lastIndex;
            }
            if (lastIdx < rel.length) parts.push(rel.slice(lastIdx));
            // parts now like ['#1','>','#2','>','#3']
            for (let i = 0; i + 2 < parts.length; i += 2) {
              const aStr = parts[i];
              const op = parts[i+1];
              const bStr = parts[i+2];
              if (!aStr.startsWith('#') || !bStr.startsWith('#')) continue;
              const a = parseInt(aStr.slice(1));
              const b = parseInt(bStr.slice(1));
              const ta = assign[a];
              const tb = assign[b];
              if (!ta || !tb) return;
              if (!testRelation(ta, tb, op)) return;
            }
          }
          results.push({...assign, groups});
          return;
        }
        for (const cand of nodeMatches[pos]||[]) {
          if (Object.values(assign).includes(cand.token)) continue;
          dfs(pos+1, {...assign, [pos]: cand.token}, [...groups, ...cand.groups]);
        }
      };
      dfs(1, {}, []);

      let matched = false;
      for (const res of results.length?results:[{}]) {
        if (results.length) matched = true;
        for (let act of tr.actStrs) {
          if (act==='last' || act==='once') continue;
          act = act.replace(/\$([0-9]+)([LU]?)/g, (_,n,c)=>{
            const v = res.groups?.[parseInt(n)-1] ?? '';
            return c==='L'?v.toLowerCase():c==='U'?v.toUpperCase():v;
          });
          if (act.startsWith('#S:')) {
            const [,kv] = act.split(':',2);
            const [k,v] = kv.split('=',2);
            sentence.annotations[k]=v;
            continue;
          }
          const mAssign = act.match(/^#(\d+):([a-z0-9_]+)(\+|-)?=(.*)$/i);
          if (mAssign) {
            const idx = parseInt(mAssign[1]); const field=mAssign[2]; const op=mAssign[3]; let val=mAssign[4];
            const tok = res[idx];
            if (!tok) continue;
            if (op==='+') {
              const old = getField(tok, field);
              if (old && old!=='_') {
                const set = new Set([...old.split('|'), ...val.split('|')].filter(Boolean));
                val = Array.from(set).sort().join('|');
              }
            } else if (op==='-') {
              const old = getField(tok, field);
              const remove = new Set(val.split('|'));
              val = old.split('|').filter((x: string) =>!remove.has(x)).join('|') || '_';
            }
            setField(tok, field, val);
            continue;
          }
          const mHead = act.match(/^#(\d+)>(#)?(\d+)$/);
          if (mHead) {
            const t1=res[parseInt(mHead[1])]; const t2=res[parseInt(mHead[3])];
            if (t1&&t2) t2.head = t1.id;
            continue;
          }
          const mE = act.match(/^#(\d+)~#(\d+)$/);
          if (mE) {
            const t1=res[parseInt(mE[1])]; const t2=res[parseInt(mE[2])];
            if (t1 && t2 &&!t2.edep.some(([h]: [string, string]) => h === t1.id)) t2.edep.push([t1.id,'']);
            continue;
          }
          const mEdep = act.match(/^#(\d+):edep=(.+)$/);
          if (mEdep) {
            const t=res[parseInt(mEdep[1])];
            if (t) {
              if (t.edep.length) t.edep[t.edep.length-1][1]=mEdep[2];
              else t.edep.push([t.head, mEdep[2]]);
            }
          }
        }
        if (tr.actStrs.includes('once')) break;
      }
      if (matched && tr.actStrs.includes('last')) return;
    }
  }

  process(conllu: string): string {
    const sents = this.parseConllu(conllu);
    for (const s of sents) this.apply(s);
    return this.serialize(sents);
  }
}
