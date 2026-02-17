const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ID_LENGTH = 5;

function getRandomValues(length: number): Uint8Array {
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return array;
}

export function generateErrorId(): string {
  const values = getRandomValues(ID_LENGTH);
  let result = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    result += CHARS[values[i] % CHARS.length];
  }
  
  return `ERR-${result}`;
}
