#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { convertStanfordToUD, annotateSentenceType, enhanceEnglish, applyMorphology, fullEnglishPipeline, DepEditEngine } from './index.js';

function usage() {
  console.log(`DepEdit_TS v0.0.1
Usage:
  depedit-ts <command> [input.conllu] [output.conllu]

Commands:
  stan2uni      Convert Stanford Typed Dependencies to UD
  senttype      Add GUM sentence type
  enhance       Apply English enhanced UD rules
  morph         Apply morphological enrichment
  pipeline      Full: stan2uni -> morph -> senttype -> enhance
  run <ini>     Run custom .ini rules

If input omitted, reads stdin. If output omitted, writes stdout.`);
}

const args = process.argv.slice(2);
if (!args.length || args[0]==='-h' || args[0]==='--help') { usage(); process.exit(0); }

const cmd = args[0];
const inFile = args[1] && !args[1].startsWith('-') && cmd!=='run' ? args[1] : (cmd==='run'? args[2]: undefined);
const outFile = cmd==='run' ? args[3] : args[2];

let input = '';
if (inFile) input = readFileSync(inFile, 'utf8');
else {
  // read stdin
  input = readFileSync(0, 'utf8');
}

let output = '';
switch(cmd) {
  case 'stan2uni': output = convertStanfordToUD(input); break;
  case 'senttype': output = annotateSentenceType(input); break;
  case 'enhance': output = enhanceEnglish(input); break;
  case 'morph': output = applyMorphology(input); break;
  case 'pipeline': output = fullEnglishPipeline(input); break;
  case 'run': {
    const iniFile = args[1];
    if (!iniFile) { console.error('Missing ini file'); process.exit(1); }
    const ini = readFileSync(iniFile, 'utf8');
    const e = new DepEditEngine();
    e.loadIniString(ini);
    output = e.process(input);
    break;
  }
  default: usage(); process.exit(1);
}

if (outFile) writeFileSync(outFile, output);
else process.stdout.write(output);
