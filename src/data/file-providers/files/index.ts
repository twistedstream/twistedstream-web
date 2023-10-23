import { resolveFileType } from "friendly-mimes";
import { Dictionary, keyBy } from "lodash";
import { readdir } from "node:fs/promises";

import fs, { ReadStream } from "node:fs";
import path from "node:path";
import { FileInfo, MediaType } from "../../../types/entity";
import { fileTypeFromMediaType } from "../../../utils/file";
import { unique } from "../../../utils/identifier";

const BASE_URL = "https://example.com/";

export type LocalFiles = { all: FileInfo[]; byUrl: Dictionary<FileInfo> };

export async function loadFiles(): Promise<LocalFiles> {
  const localFiles = await readdir(__dirname);
  const all = localFiles
    // ignore code files
    .filter((f) => !f.endsWith(".ts"))
    .map((f) => {
      const [name, ext] = f.split(".");

      const mime = resolveFileType(`.${ext}`);
      const mediaType: MediaType = {
        name: mime.mime,
        description: mime.name,
        extension: ext,
      };

      const fileType = fileTypeFromMediaType(mediaType);

      return <FileInfo>{
        id: unique(),
        title: name,
        type: fileType,
        availableMediaTypes: [mediaType],
      };
    });

  const files = {
    all,
    byUrl: keyBy(all, (f) => `${BASE_URL}${f.id}`),
  };

  return files;
}

export function getFileStream(fileName: string): ReadStream {
  const filePath = path.join(__dirname, fileName);
  const fileStream = fs.createReadStream(filePath);
  return fileStream;
}
