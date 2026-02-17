import type { StackFrame } from '../types';

const CHROME_STACK_REGEX = /^\s*at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+)|([^)]+))\)?$/;
const GECKO_STACK_REGEX = /^(.*)@(.+?):(\d+):(\d+)$/;
const ERROR_PREFIX_REGEX = /^(?:Error|TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError):/;

function isAppCode(file: string, fn: string): boolean {
  if (!file || file === '<anonymous>' || file === 'anonymous') {
    return false;
  }

  const builtInPrefixes = ['Array.', 'Object.', 'String.', 'Number.', 'Promise.', 'Map.', 'Set.', 'JSON.'];
  if (builtInPrefixes.some((prefix) => fn.startsWith(prefix))) {
    return false;
  }

  if (file.includes('node_modules') || file.includes('vendor')) {
    return false;
  }

  if (/^chunk-[a-zA-Z0-9]+\.js/.test(file)) {
    return false;
  }

  const sourceExtensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.vue', '.svelte'];

  return sourceExtensions.some((ext) => file.includes(ext));
}

function extractFileName(path: string): string {
  const parts = path.split('/');

  return parts[parts.length - 1] || path;
}

function parseChromeLine(line: string): StackFrame | null {
  const match = line.match(CHROME_STACK_REGEX);
  if (!match) return null;

  const [, fn, file, lineStr, colStr, evalOrigin] = match;

  if (evalOrigin) {
    return {
      fn: fn || 'eval',
      file: evalOrigin,
      line: 0,
      col: 0,
      isAppCode: isAppCode(evalOrigin, fn || 'eval'),
    };
  }

  return {
    fn: fn || '(anonymous)',
    file: extractFileName(file || ''),
    line: parseInt(lineStr || '0', 10),
    col: parseInt(colStr || '0', 10),
    isAppCode: isAppCode(file || '', fn || ''),
  };
}

function parseGeckoLine(line: string): StackFrame | null {
  const match = line.match(GECKO_STACK_REGEX);
  if (!match) return null;

  const [, fn, file, lineStr, colStr] = match;

  return {
    fn: fn || '(anonymous)',
    file: extractFileName(file || ''),
    line: parseInt(lineStr || '0', 10),
    col: parseInt(colStr || '0', 10),
    isAppCode: isAppCode(file || '', fn || ''),
  };
}

export function parseStack(stack: string | undefined): StackFrame[] {
  if (!stack) return [];

  const lines = stack.split('\n').filter((line) => line.trim());
  const frames: StackFrame[] = [];

  for (const line of lines) {
    if (ERROR_PREFIX_REGEX.test(line)) {
      continue;
    }

    const frame = parseChromeLine(line) ?? parseGeckoLine(line);

    if (frame) {
      frames.push(frame);
    }
  }

  return frames;
}

export function getFirstAppFrame(frames: StackFrame[]): StackFrame | null {
  return frames.find((frame) => frame.isAppCode) || null;
}
