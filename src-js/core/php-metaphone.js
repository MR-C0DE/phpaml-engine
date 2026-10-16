import {asciiUpper, byteString, bounded, failure, work} from './php-builtin-support.js';

// Traditional English Metaphone rules, including PHP's initial-letter handling.
export const metaphone = (input, maximum, context) => {
  if (maximum < 0) throw failure('ValueError', 'metaphone(): max_phonemes must be greater than or equal to 0');
  const word = asciiUpper(byteString(input)).split('\0')[0];
  const letter = (offset) => word[offset] || '', vowel = (char) => /^[AEIOU]$/.test(char), soft = (char) => /^[EIY]$/.test(char);
  let index = word.search(/[A-Z]/), output = '';
  if (index < 0) return output;
  const first = letter(index), second = letter(index + 1);
  if (first === 'A' && second === 'E') {output = 'E'; index += 2;}
  else if (vowel(first)) {output = first; index++;}
  else if (/^[GKP]$/.test(first) && second === 'N') {output = 'N'; index += 2;}
  else if (first === 'W' && (second === 'R' || second === 'H' || vowel(second))) {output = second === 'R' ? 'R' : 'W'; index += 2;}
  else if (first === 'X') {output = 'S'; index++;}
  for (; index < word.length && (!maximum || output.length < maximum); index++) {
    work(context);
    const current = letter(index), previous = letter(index - 1), next = letter(index + 1), after = letter(index + 2);
    if (current === previous && current !== 'C') continue;
    let sound = '';
    switch (current) {
      case 'B': sound = previous === 'M' ? '' : 'B'; break;
      case 'C':
        if (soft(next)) sound = next === 'I' && after === 'A' ? 'X' : previous === 'S' ? '' : 'S';
        else if (next === 'H') {sound = 'X'; index++;}
        else sound = 'K';
        break;
      case 'D': if (next === 'G' && soft(after)) {sound = 'J'; index++;} else sound = 'T'; break;
      case 'G':
        if (next === 'H') {if (!/^[BDH]$/.test(letter(index - 3)) && letter(index - 4) !== 'H') {sound = 'F'; index++;}}
        else if (next === 'N') sound = !/^[A-Z]$/.test(after) || after === 'E' && letter(index + 3) === 'D' ? '' : 'K';
        else sound = soft(next) && previous !== 'G' ? 'J' : 'K';
        break;
      case 'H': sound = vowel(next) && !/^[CGPST]$/.test(previous) ? 'H' : ''; break;
      case 'K': sound = previous === 'C' ? '' : 'K'; break;
      case 'P': sound = next === 'H' ? 'F' : 'P'; break;
      case 'Q': sound = 'K'; break;
      case 'S': if (next === 'H') {sound = 'X'; index++;} else sound = next === 'I' && /^[OA]$/.test(after) ? 'X' : 'S'; break;
      case 'T':
        if (next === 'I' && /^[OA]$/.test(after)) sound = 'X';
        else if (next === 'H') {sound = '0'; index++;}
        else sound = next === 'C' && after === 'H' ? '' : 'T';
        break;
      case 'V': sound = 'F'; break;
      case 'W': case 'Y': sound = vowel(next) ? current : ''; break;
      case 'X': sound = 'KS'; break;
      case 'Z': sound = 'S'; break;
      default: sound = /^[FJLMNR]$/.test(current) ? current : '';
    }
    output += sound;
  }
  return bounded(output);
};
