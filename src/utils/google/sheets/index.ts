import { Mutex } from "async-mutex";

import {
  ColumnConstraints,
  KeyColumnSelector,
  Row,
  RowData,
  SearchPredicate,
} from "../../../types/row";
import { googleSpreadsheetId as spreadsheetId } from "../../../utils/config";
import { assertValue } from "../../../utils/error";
import { sheets } from "./client";
import { enforceConstraints, openTable } from "./table";
import { parseRange, rowToValues, valuesToRow } from "./value";

const mutex = new Mutex();

export async function countRows(sheetName: string): Promise<number> {
  const range = `${sheetName}!A:A`;

  const getResult = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const values = getResult.data.values || [];

  // don't include header row
  return values.length - 1;
}

export async function findRows(
  sheetName: string,
  predicate: SearchPredicate
): Promise<{ rows: Row[] }> {
  const { rows } = await openTable(sheetName);
  const foundRows = rows.filter(predicate);

  return { rows: foundRows };
}

export async function findRow(
  sheetName: string,
  predicate: SearchPredicate
): Promise<{ row?: Row }> {
  const { rows } = await openTable(sheetName);
  const row = rows.find(predicate);

  return { row };
}

export async function findKeyRows<T extends keyof any>(
  sheetName: string,
  selector: KeyColumnSelector<T>,
  keys: T[]
): Promise<{ rowsByKey: Record<T, Row> }> {
  // get distinct list of keys
  const distinctKeys = Array.from(new Set(keys));

  // find all rows with those keys
  const { rows } = await findRows(sheetName, (r) =>
    distinctKeys.includes(selector(r))
  );

  // return dictionary, mapping keys to Rows
  const rowsByValue = rows.reduce((p, c) => {
    p[selector(c)] = c;
    return p;
  }, <Record<T, Row>>{});

  return { rowsByKey: rowsByValue };
}

export async function insertRow(
  sheetName: string,
  newRow: RowData,
  constraints: ColumnConstraints = {}
): Promise<{ insertedRow: Row }> {
  return mutex.runExclusive(async () => {
    const { columns, rows } = await openTable(sheetName);

    // enforce constraint before insert
    enforceConstraints(rows, newRow, constraints);

    // append row
    const rowValues = rowToValues(newRow, columns);
    const appendResult = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetName,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      includeValuesInResponse: true,
      responseValueRenderOption: "UNFORMATTED_VALUE",
      responseDateTimeRenderOption: "SERIAL_NUMBER",
      requestBody: {
        values: [rowValues],
      },
    });

    // TODO: pull out into helper function
    const { range, values } = assertValue(
      assertValue(appendResult.data.updates).updatedData
    );
    if (values?.length !== 1) {
      throw new Error("Unexpected multiple rows updated");
    }
    const returnedRowValues = assertValue(values)[0];
    if (
      rowValues
        .map((value, index) => {
          const returnedValue = returnedRowValues[index];
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

    const insertedRow = valuesToRow(returnedRowValues, columns, startRow);
    return { insertedRow };
  });
}

export async function updateRow(
  sheetName: string,
  predicate: SearchPredicate,
  rowUpdates: RowData,
  constraints: ColumnConstraints = {}
): Promise<{ updatedRow: Row }> {
  return mutex.runExclusive(async () => {
    const { columns, rows } = await openTable(sheetName);

    // find row
    const row = rows.find(predicate);
    if (!row) {
      throw new Error("Row not found");
    }

    // update row values
    for (const key in rowUpdates) {
      row[key] = rowUpdates[key];
    }

    // enforce constraints before update
    enforceConstraints(rows, row, constraints);

    // update row
    const rowValues = rowToValues(row, columns);
    const updateResult = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${row._rowNumber}:${row._rowNumber}`,
      valueInputOption: "RAW",
      includeValuesInResponse: true,
      responseValueRenderOption: "UNFORMATTED_VALUE",
      responseDateTimeRenderOption: "SERIAL_NUMBER",
      requestBody: {
        values: [rowValues],
      },
    });

    // TODO: pull out into helper function
    const { range, values } = assertValue(updateResult.data.updatedData);
    if (values?.length !== 1) {
      throw new Error("Unexpected multiple rows updated");
    }
    const returnedRowValues = assertValue(values)[0];
    if (
      rowValues
        .map((value, index) => {
          const returnedValue = returnedRowValues[index];
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

    const updatedRow = valuesToRow(returnedRowValues, columns, startRow);
    return { updatedRow };
  });
}

export async function deleteRow(
  sheetName: string,
  predicate: SearchPredicate
): Promise<void> {
  return mutex.runExclusive(async () => {
    const { rows } = await openTable(sheetName);
    // find row
    const row = rows.find(predicate);
    if (!row) {
      throw new Error("Row not found");
    }

    // get sheet ID
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === sheetName
    )?.properties?.index;
    if (sheetId === undefined) {
      throw new Error(`Sheet with name '${sheetName}' not found`);
    }

    // delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: row._rowNumber - 1,
                endIndex: row._rowNumber,
              },
            },
          },
        ],
      },
    });
  });
}
