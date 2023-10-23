import sinon from "sinon";
import { test } from "tap";

// test objects

const readdirStub = sinon.stub();
const uniqueStub = sinon.stub();
const createReadStreamStub = sinon.stub();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./index", {
    "node:fs/promises": { readdir: readdirStub },
    "node:fs": { createReadStream: createReadStreamStub },
    "../../../utils/identifier": { unique: uniqueStub },
  });
}

// tests

test("data/file-providers/local", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("loadFiles", async (t) => {
    let loadFiles: any;

    t.beforeEach(async () => {
      const result = importModule(t);
      loadFiles = result.loadFiles;
    });

    t.test("reads files in the current directory", async (t) => {
      try {
        await loadFiles();
      } catch {}

      t.ok(readdirStub.called);
      t.equal(readdirStub.firstCall.firstArg, __dirname);
    });

    t.test("filters and transforms the files to expected output", async (t) => {
      readdirStub.resolves(["file1.doc", "file2.ts", "file3.xls"]);
      uniqueStub.onFirstCall().returns("FILE_1");
      uniqueStub.onSecondCall().returns("FILE_2");

      const result = await loadFiles();

      const file1 = {
        id: "FILE_1",
        title: "file1",
        type: "document",
        availableMediaTypes: [
          {
            name: "application/msword",
            description: "Microsoft Word",
            extension: "doc",
          },
        ],
      };

      const file3 = {
        id: "FILE_2",
        title: "file3",
        type: "spreadsheet",
        availableMediaTypes: [
          {
            name: "application/vnd.ms-excel",
            description: "Microsoft Excel",
            extension: "xls",
          },
        ],
      };

      t.same(result, {
        all: [file1, file3],
        byUrl: {
          "https://example.com/FILE_1": file1,
          "https://example.com/FILE_2": file3,
        },
      });
    });
  });

  t.test("getFileStream", async (t) => {
    let getFileStream: any;

    t.beforeEach(async () => {
      const result = importModule(t);
      getFileStream = result.getFileStream;
    });

    t.test("creates a file read stream with the expected path", async (t) => {
      getFileStream("file.doc");

      t.ok(createReadStreamStub.called);
      t.equal(createReadStreamStub.firstCall.firstArg, `${__dirname}/file.doc`);
    });

    t.test("returns the file stream", async (t) => {
      const fileStream = {};
      createReadStreamStub.returns(fileStream);

      const result = getFileStream("file.doc");

      t.equal(result, fileStream);
    });
  });
});
