export type TokenID = string;

export interface Token {
  id: TokenID;
  num: number;
  text: string;
  lemma: string;
  pos: string;      // UPOS
  cpos: string;     // XPOS
  morph: string;    // FEATS
  head: TokenID;    // HEAD
  func: string;     // DEPREL
  head2: string;    // DEPS
  func2: string;    // MISC
  edep: Array<[string, string]>;
  storage: string;
  storage2: string;
  storage3: string;
  child_funcs: string[];
  position: 'first' | 'middle' | 'last';
  is_super_tok: boolean;
  sentence?: Sentence;
}

export interface Sentence {
  tokens: Token[];
  annotations: Record<string, string>;
  input_annotations: Record<string, string>;
  docname: string;
}
