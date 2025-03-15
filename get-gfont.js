import { createWriteStream, writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import { Readable } from 'node:stream';

const [, , fontName, ranges = 'latin,latin-ext'] = process.argv;

const response = await fetch('https://fonts.google.com/$rpc/fonts.fe.catalog.actions.metadata.MetadataService/FamilyInfo', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json+protobuf',
    Accept: 'application/json'
  },
  body: JSON.stringify([[[fontName]]])
});

const result = await response.json();
if (typeof result[1] === 'string') {
  console.error(result[1]);
  process.exit(1);
}

let variants;
try {
  [[[, [, , , , , , variants]]]] = result;
} catch {
  console.error('Could not parse response');
  console.log(JSON.stringify(result));
  process.exit(1);
}

const ALLOWED_PARAMS = ['ital', 'wght'];
const weights = variants.map(([params]) => {
  const entries = params.filter(([params]) => ALLOWED_PARAMS.includes(params)).map(([param, ...values]) => [param, values.join('..')]);
  return Object.fromEntries(entries);
});

const paramString = weights.every(({ ital }) => ital === '0')
  ? `wght@${weights.map(({ wght }) => wght).join(';')}`
  : `ital,wght@${weights.map(({ ital, wght }) => `${ital},${wght}`).join(';')}`;

const cssURL = new URL('https://fonts.googleapis.com/css2');
cssURL.searchParams.set('family', `${fontName}:${paramString}`);
cssURL.searchParams.set('display', 'swap');

const UA_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
const cssResponse = await fetch(cssURL.href, { headers: { 'User-Agent': UA_STRING } });
if (cssResponse.status !== 200) {
  console.error(cssResponse.statusText);
  process.exit(1);
}

const cssText = await cssResponse.text();
// console.log(cssText);

const allowedRanges = ranges.trim().split(/\s*,\s*/);
const definitions = Array.from(cssText.matchAll(/\/\* ([a-z-]+) \*\/\n@font-face \{\n([\s\S]+?)\n\}/g), ([, range, rule]) => {
  const rules = rule.split('\n').map(line => line.replace(/\s*;$/, '').trim().split(': '));
  return [range, Object.fromEntries(rules)];
}).filter(([range]) => allowedRanges.includes(range));

const normalizedFontName = fontName.toLowerCase().replace(/[^a-z]+/g, '-');

const weightMap = {
  100: 'thin',
  200: 'extralight',
  300: 'light',
  400: 'regular',
  500: 'medium',
  600: 'semibold',
  700: 'bold',
  800: 'extrabold',
  900: 'black'
};

const sources = definitions.map(([range, { src, 'font-style': style, 'font-weight': weight }]) => {
  const sourceDef = Array.from(src.replace(/\s*;$/, '').matchAll(/\b([a-z]+)\(([^)]*)\)/g), ([, param, value]) => [param, value]);
  const variant = `${weightMap[weight]}${style === 'italic' ? '-italic' : ''}.${range}`;
  return [variant, Object.fromEntries(sourceDef)];
});

const fileNames = await Promise.all(
  sources.map(async ([variant, source]) => {
    const fontResponse = await fetch(source.url);
    const stream = Readable.fromWeb(fontResponse.body);
    const fileName = `fonts/${normalizedFontName}.${variant}${extname(source.url)}`;
    stream.pipe(createWriteStream(`./static/${fileName}`));
    return fileName;
  })
);

const outputCSS = definitions
  .map(([range, { src, ...def }], index) => {
    const fileName = fileNames[index];
    return `/* ${range} */\n@font-face {\n${Object.entries(def)
      .map(([property, value]) => `  ${property}: ${value};\n`)
      .join('')}  src: url('../${fileName}') format(${sources[index][1].format});\n}\n`;
  })
  .join('');

writeFileSync(`./src/styles/typography/${normalizedFontName}.scss`, outputCSS);
