# DepEdit_TS

TypeScript port of **DepEdit** – a rule-based universal dependency grammar editor and corrector.

This library is self-contained: the four classic configurations are embedded, so no external `.ini` files are required.

## Features
- Full CoNLL-U parser/serializer
- Definition matching with regex, conjunctions, negation
- Relations: `#1>#2`, `#1~#2`, `#1.#2`, `#1.*#2`, `#1.1,5#2`
- Actions: field set/append/remove, head rewiring, enhanced deps, sentence annotations, `$1` capture substitution
- Built-in presets:
  - **STAN2UNI** – Stanford Typed Dependencies → Universal Dependencies
  - **ENG_SENT_TYPE** – GUM sentence typing
  - **ENG_ENHANCE** – enhanced UD (xsubj, case/mark augmentation, conj propagation)
  - **ENG_MORPH** – morphological features

## Install
```bash
npm install
npm run build
```

## Library usage
```ts
import { convertStanfordToUD, fullEnglishPipeline, DepEditEngine } from 'DepEdit_TS';

const ud = convertStanfordToUD(stanfordConllu);
const full = fullEnglishPipeline(stanfordConllu);

// custom
const engine = new DepEditEngine();
engine.loadIniString(myRules);
const out = engine.process(conllu);
```

## CLI
```bash
npx depedit-ts stan2uni input.conllu output.conllu
npx depedit-ts pipeline input.conllu
npx depedit-ts run myrules.ini input.conllu
cat file.conllu | depedit-ts enhance
```

## Project structure
```
/src
  types.ts          # Token, Sentence interfaces
  utils.ts          # field aliases, relations
  matcher.ts        # DefinitionMatcher
  transformation.ts # Transformation parser
  engine.ts         # DepEditEngine core
  presets.ts        # embedded INIs + factories
  index.ts          # public exports
  cli.ts            # command-line entry
```


## Testing

The repo includes a Vitest suite covering the core transformations.

```bash
npm install
npm test
```

Tests validate:
- Stanford `dobj` → UD `obj`
- `prep` + `pobj` → `case` + `nmod`
- Morphological features (Number, VerbForm, etc.)
- Sentence typing (`# s_type = wh`)
- Enhanced dependencies

Run in watch mode:
```bash
npm run test:watch
```

## Publishing to npm

1. Build:
```bash
npm run build
```

2. Login:
```bash
npm login
```

3. Publish (public):
```bash
npm publish
```

The `package.json` includes:
- `"files": ["dist", "README.md", "LICENSE"]` – only compiled output ships
- `"prepublishOnly": "npm run build"` – ensures dist is fresh
- `"publishConfig": {"access": "public"}`

Recommended `.npmignore` excludes `src/` and `tests/`.
