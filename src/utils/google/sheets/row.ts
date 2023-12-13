import { sheets_v4 } from "googleapis/build/src/apis/sheets/v4";
import { Row, RowData } from "../../../types/table";
import { assertValue } from "../../error";
import { parseRange } from "./range";

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

export function processUpdatedData(
  updatedValueRange: sheets_v4.Schema$ValueRange,
  sheetName: string,
  submittedRowValues: any[]
): { updatedRowValues: any[]; updatedRowNumber: number } {
  const { range, values } = updatedValueRange;
  if (values?.length !== 1) {
    throw new Error("Unexpected multiple rows updated");
  }
  const updatedRowValues = assertValue(values)[0];
  if (
    submittedRowValues
      .map((value, index) => {
        const returnedValue = updatedRowValues[index];
        if (value === returnedValue) {
          return true;
        }
        if (value === undefined && returnedValue === "") {
          return true;
        }
        if (value === "" && returnedValue === undefined) {
          return true;
        }
        return false;
      })
      .some((isEqual) => !isEqual)
  ) {
    throw new Error(
      "One or more response row values don't match corresponding request value values"
    );
  }

  const { sheet, startRow, endRow } = parseRange(assertValue(range));
  if (sheetName !== sheet) {
    throw new Error("Sheet names don't match");
  }
  if (startRow !== endRow) {
    throw new Error("Start row doesn't match end row");
  }

  return { updatedRowValues, updatedRowNumber: startRow };
}
