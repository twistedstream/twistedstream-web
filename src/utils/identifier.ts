import { v4 } from "uuid";

export function unique(): string {
  return v4();
}
