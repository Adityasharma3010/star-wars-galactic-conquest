import sqlPlugin from 'prettier-plugin-sql';
import { format as formatSql } from 'sql-formatter';

const dollarTag = /^\$(?:[a-zA-Z_][a-zA-Z_0-9]*)?\$/;
const operators = ['->>', '#>>', '::', ':=', '<=', '>=', '<>', '!=', '||', '->', '#>', '=>'];

function quotedEnd(text, start) {
  const quote = text[start];
  let index = start + 1;
  while (index < text.length) {
    if (text[index] === quote) {
      if (text[index + 1] === quote) index += 2;
      else return index + 1;
    } else if (text[index] === '\\') index += 2;
    else index++;
  }
  throw new Error('Unterminated SQL quote.');
}

function commentEnd(text, start) {
  if (text.startsWith('--', start)) {
    const end = text.indexOf('\n', start);
    return end < 0 ? text.length : end;
  }
  let depth = 1;
  let index = start + 2;
  while (index < text.length && depth) {
    if (text.startsWith('/*', index)) {
      depth++;
      index += 2;
    } else if (text.startsWith('*/', index)) {
      depth--;
      index += 2;
    } else index++;
  }
  return index;
}

function jsonBody(text) {
  if (!/^[\s]*[\[{]/.test(text)) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Comparing lexical tokens catches accidental changes to applied SQL migrations.
function tokens(text) {
  const result = [];
  for (let index = 0; index < text.length;) {
    if (/\s/.test(text[index])) {
      index++;
      continue;
    }
    if (text.startsWith('--', index) || text.startsWith('/*', index)) {
      index = commentEnd(text, index);
      continue;
    }
    if (text[index] === "'" || text[index] === '"') {
      const end = quotedEnd(text, index);
      result.push(text.slice(index, end));
      index = end;
      continue;
    }
    const tag = text.slice(index).match(dollarTag)?.[0];
    if (tag) {
      const end = text.indexOf(tag, index + tag.length);
      if (end < 0) throw new Error('Unterminated SQL dollar quote.');
      const body = text.slice(index + tag.length, end);
      const json = jsonBody(body);
      result.push([tag, json === null ? tokens(body) : JSON.stringify(json)]);
      index = end + tag.length;
      continue;
    }
    const word = text.slice(index).match(/^[a-zA-Z_0-9]+/);
    if (word) {
      result.push(word[0]);
      index += word[0].length;
      continue;
    }
    const operator = operators.find((value) => text.startsWith(value, index));
    result.push(operator || text[index]);
    index += operator?.length || 1;
  }
  return result;
}

function formatBodies(text, options) {
  let result = '';
  for (let index = 0; index < text.length;) {
    if (text.startsWith('--', index) || text.startsWith('/*', index)) {
      const end = commentEnd(text, index);
      result += text.slice(index, end);
      index = end;
      continue;
    }
    if (text[index] === "'" || text[index] === '"') {
      const end = quotedEnd(text, index);
      result += text.slice(index, end);
      index = end;
      continue;
    }
    const tag = text.slice(index).match(dollarTag)?.[0];
    if (!tag) {
      result += text[index++];
      continue;
    }
    const end = text.indexOf(tag, index + tag.length);
    if (end < 0) throw new Error('Unterminated SQL dollar quote.');
    const body = text.slice(index + tag.length, end);
    const json = jsonBody(body);
    const formatted =
      json === null
        ? formatSql(formatBodies(body, options), {
            language: 'postgresql',
            tabWidth: options.tabWidth || 2,
            keywordCase: 'preserve',
            dataTypeCase: 'preserve',
            functionCase: 'preserve',
            identifierCase: 'preserve',
          }).trim()
        : JSON.stringify(json, null, options.tabWidth || 2);
    result += tag + '\n' + formatted + '\n' + tag;
    index = end + tag.length;
  }
  return result;
}

export default {
  ...sqlPlugin,
  parsers: {
    ...sqlPlugin.parsers,
    sql: {
      ...sqlPlugin.parsers.sql,
      preprocess(text, options) {
        const formatted = formatBodies(text, options);
        if (JSON.stringify(tokens(text)) !== JSON.stringify(tokens(formatted))) {
          throw new Error('SQL formatting changed tokens; the source was left intact.');
        }
        return formatted;
      },
    },
  },
  printers: {
    ...sqlPlugin.printers,
    sql: {
      ...sqlPlugin.printers.sql,
      print(path, options, print) {
        const formatted = sqlPlugin.printers.sql.print(path, options, print);
        if (JSON.stringify(tokens(path.node)) !== JSON.stringify(tokens(formatted))) {
          throw new Error('SQL formatting changed tokens; the source was left intact.');
        }
        return formatted;
      },
    },
  },
};
