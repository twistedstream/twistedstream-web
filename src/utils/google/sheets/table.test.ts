import { cloneDeep } from "lodash";
import sinon from "sinon";
import { test } from "tap";
import { ColumnConstraints } from "../../../types/table";

// test objects
const getValuesStub = sinon.stub();
const valuesToRowStub = sinon.stub();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./table", {
    "../../../utils/config": {
      googleSpreadsheetId: "spreadsheet-id",
    },
    "./client": {
      sheets: {
        spreadsheets: {
          values: {
            get: getValuesStub,
          },
        },
      },
    },
    "./row": {
      valuesToRow: valuesToRowStub,
    },
  });
}

test("utils/google/sheets/table", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("openTable", async (t) => {
    const { openTable } = importModule(t);

    t.test("fetches data from the Google Sheets API", async (t) => {
      try {
        await openTable("bananas");
      } catch {}

      t.match(getValuesStub.firstCall.firstArg, {
        spreadsheetId: "spreadsheet-id",
        range: "bananas",
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "SERIAL_NUMBER",
      });
    });

    t.test("when no data exists, returns empty table", async (t) => {
      getValuesStub.resolves({ data: { values: undefined } });

      const result = await openTable("bananas");

      t.match(result, { columns: [], rows: [] });
    });

    t.test("when data exists", async (t) => {
      const values = [
        ["first_name", "last_name", "age"],
        ["Bob", "Smith", 42],
        ["Jim", "Johnson", 24],
      ];

      t.beforeEach(async () => {
        getValuesStub.resolves({ data: { values: cloneDeep(values) } });
      });

      t.test("converts each row of values to row objects", async (t) => {
        await openTable("bananas");

        const firstCall = valuesToRowStub.getCall(0);
        t.match(firstCall.args[0], values[1]);
        t.match(firstCall.args[1], values[0]);
        t.match(firstCall.args[2], 2);

        const secondCall = valuesToRowStub.getCall(1);
        t.match(secondCall.args[0], values[2]);
        t.match(secondCall.args[1], values[0]);
        t.match(secondCall.args[2], 3);
      });

      t.test("returns the expected table", async (t) => {
        const row1 = {};
        valuesToRowStub.onCall(0).returns(row1);
        const row2 = {};
        valuesToRowStub.onCall(1).returns(row2);

        const result = await openTable("bananas");

        t.match(result.columns, values[0]);
        t.equal(result.rows.length, 2);
        t.equal(result.rows[0], row1);
        t.equal(result.rows[1], row2);
      });
    });
  });

  t.test("enforceConstraints", async (t) => {
    const { enforceConstraints } = importModule(t);

    t.test("uniques", async (t) => {
      const rows = [
        {
          id: "u001",
          username: "bob",
          first_name: "Bob",
          last_name: "Smith",
          age: 42,
        },
        {
          id: "u002",
          username: "jim",
          first_name: "Jim ",
          last_name: "Johnson",
          age: 24,
        },
      ];
      const constraints: ColumnConstraints = { uniques: ["id", "username"] };

      t.test("when test row exists in rows", async (t) => {
        t.test(
          "if test row has unique column values, nothing happens",
          async (t) => {
            const copy = cloneDeep(rows);
            const testRow = copy[0];
            testRow.id = "u001.1";
            testRow.username = "bob1";

            enforceConstraints(copy, testRow, constraints);
          }
        );

        t.test(
          "if test row has non-unique column values, the expected error is thrown",
          async (t) => {
            const copy = cloneDeep(rows);
            const testRow = copy[0];
            testRow.id = "u002";
            testRow.username = "jim";

            t.throws(() => enforceConstraints(copy, testRow, constraints), {
              message: `There are constraint violations:
A row already exists with id = 'u002'
A row already exists with username = 'jim'`,
            });
          }
        );
      });

      t.test("when test row is new", async (t) => {
        t.test(
          "if test row has unique column values, nothing happens",
          async (t) => {
            const copy = cloneDeep(rows);
            const testRow = {
              id: "u003",
              username: "mary",
              first_name: "Mary ",
              last_name: "Jane",
              age: 32,
            };

            enforceConstraints(copy, testRow, constraints);
          }
        );

        t.test(
          "if test row has non-unique column values, the expected error is thrown",
          async (t) => {
            const copy = cloneDeep(rows);
            const testRow = {
              id: "u001",
              username: "bob",
              first_name: "Mary",
              last_name: "Jane",
              age: 32,
            };

            t.throws(() => enforceConstraints(copy, testRow, constraints), {
              message: `There are constraint violations:
A row already exists with id = 'u001'
A row already exists with username = 'bob'`,
            });
          }
        );
      });
    });

    t.test("when no constrains, nothing happens", async (t) => {
      const constraints: ColumnConstraints = {};

      enforceConstraints([], {}, constraints);
    });
  });
});