import { Range, Row, RowData } from "../../../types/row";

export function valuesToRow(
  rowValues: any[],
  columns: string[],
  rowNumber: number
): Row {
  return rowValues.reduce(
    (row, value, index) => {
      row[columns[index]] = value;
      return row;
    },
    { _rowNumber: rowNumber }
  );
}

export function rowToValues(row: RowData, columns: string[]): any[] {
  return columns.map((c) => row[c]);
}

export function parseRange(range: string): Range {
  const match = range.match(
    /^(?<sheet>\S+)!(?<startColumn>[A-Z]+)(?<startRow>[0-9]+):(?<endColumn>[A-Z]+)(?<endRow>[0-9]+)$/
  );
  if (!match?.groups) {
    throw new Error("Missing or bad range");
  }
  const {
    groups: { sheet, startColumn, startRow, endColumn, endRow },
  } = match;

  return {
    sheet,
    startColumn,
    startRow: parseInt(startRow),
    endColumn,
    endRow: parseInt(endRow),
  };
}
