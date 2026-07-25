/**
 * A1-notation helpers. Kept dependency-free and pure so they can be reused by
 * both the parser and the rule engine.
 */

/** Convert a 0-based column index to a column letter (0 -> "A", 26 -> "AA"). */
export function columnLetter(colIndex: number): string {
  let n = colIndex;
  let letter = '';
  do {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

/** Build an A1 address from 0-based row/column indices. (0,0) -> "A1". */
export function cellAddress(rowIndex: number, colIndex: number): string {
  return `${columnLetter(colIndex)}${rowIndex + 1}`;
}

/** Build an A1 range from a bounding box of 0-based indices. */
export function rangeAddress(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): string {
  return `${cellAddress(startRow, startCol)}:${cellAddress(endRow, endCol)}`;
}
