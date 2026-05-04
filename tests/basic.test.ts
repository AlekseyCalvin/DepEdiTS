import { describe, it, expect } from 'vitest';
import { 
  convertStanfordToUD, 
  applyMorphology, 
  annotateSentenceType,
  enhanceEnglish,
  fullEnglishPipeline,
  DepEditEngine,
  parseConllu
} from '../src/index.js';

const stanfordSample = `# sent_id = 1
# text = They buy books.
1\tThey\tthey\tPRON\tPRP\t_\t2\tnsubj\t_\t_
2\tbuy\tbuy\tVERB\tVBP\t_\t0\troot\t_\t_
3\tbooks\tbook\tNOUN\tNNS\t_\t2\tdobj\t_\t_
4\t.\t.\tPUNCT\t.\t_\t2\tpunct\t_\t_
`;

const stanfordPrep = `# sent_id = 2
# text = She gave a book to Mary.
1\tShe\tshe\tPRON\tPRP\t_\t2\tnsubj\t_\t_
2\tgave\tgive\tVERB\tVBD\t_\t0\troot\t_\t_
3\ta\ta\tDET\tDT\t_\t4\tdet\t_\t_
4\tbook\tbook\tNOUN\tNN\t_\t2\tdobj\t_\t_
5\tto\tto\tADP\tIN\t_\t2\tprep\t_\t_
6\tMary\tMary\tPROPN\tNNP\t_\t5\tpobj\t_\t_
7\t.\t.\tPUNCT\t.\t_\t2\tpunct\t_\t_
`;

describe('DepEdit_TS core', () => {
  it('parses CoNLL-U', () => {
    const engine = new DepEditEngine();
    const sents = engine.parseConllu(stanfordSample);
    expect(sents).toHaveLength(1);
    expect(sents[0].tokens).toHaveLength(4);
    expect(sents[0].tokens[1].text).toBe('buy');
  });

  it('converts Stanford dobj -> obj', () => {
    const out = convertStanfordToUD(stanfordSample);
    expect(out).toContain('\tobj\t');
    expect(out).not.toContain('\tdobj\t');
  });

  it('converts prep+pobj to case+nmod', () => {
    const out = convertStanfordToUD(stanfordPrep);
    expect(out).toMatch(/5\tto\t.*\tcase\t/);
    expect(out).toMatch(/6\tMary\t.*\tobl\t/);
  });

  it('applies morphology', () => {
    const out = applyMorphology(stanfordSample);
    // books NNS -> Number=Plur
    expect(out).toMatch(/books\tbook\tNOUN\tNNS\tNumber=Plur/);
    // buy VBP -> VerbForm=Fin|Mood=Ind|Tense=Pres
    expect(out).toMatch(/buy\tbuy\tVERB\tVBP\t.*VerbForm=Fin/);
  });

  it('adds sentence type', () => {
    const question = `# sent_id = q1
1\tWhat\twhat\tPRON\tWP\t_\t2\tnsubj\t_\t_
2\tis\tbe\tAUX\tVBZ\t_\t0\troot\t_\t_
3\tthis\tthis\tPRON\tDT\t_\t2\tnsubj\t_\t_
4\t?\t?\tPUNCT\t.\t_\t2\tpunct\t_\t_
`;
    const out = annotateSentenceType(question);
    expect(out).toContain('# s_type = wh');
  });

  it('enhances English with edep', () => {
    const out = enhanceEnglish(stanfordSample);
    // should have enhanced deps copied
    expect(out).toMatch(/0:root/); // head2 column
  });

  it('full pipeline runs end-to-end', () => {
    const out = fullEnglishPipeline(stanfordPrep);
    expect(out).toContain('\tobj\t'); // from stan2uni
    expect(out).toContain('Number=Sing'); // from morph
    expect(out).toContain('# s_type ='); // from senttype
    expect(out).toMatch(/:root|nsubj/); // enhanced
  });
});
