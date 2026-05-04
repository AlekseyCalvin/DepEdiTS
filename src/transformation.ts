import { DefinitionMatcher } from './matcher.js';

export class Transformation {
  defStrs: string[];
  relStrs: string[];
  actStrs: string[];
  definitions: DefinitionMatcher[] = [];

  constructor(public line: string) {
    const parts = line.split('\t');
    if (parts.length < 3) throw new Error('Invalid transformation: ' + line);
    this.defStrs = parts[0].split(';').map(s=>s.trim()).filter(Boolean);
    this.relStrs = parts[1].split(';').map(s=>s.trim()).filter(Boolean);
    this.actStrs = parts[2].split(';').map(s=>s.trim()).filter(Boolean);
    this.definitions = this.defStrs.map((d,i)=> new DefinitionMatcher(i+1, d));
  }
}
