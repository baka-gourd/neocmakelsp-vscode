import { createInterface } from "node:readline";
import { stripVTControlCharacters } from "node:util";
import type { Readable } from "node:stream";

type Level = "trace" | "debug" | "info" | "warn" | "error";
type LogOutput = Record<Level, (message: string) => void>;

export function forwardServerLog(input: Readable, output: LogOutput, fallback: Level): void {
  const lines = createInterface({ input, crlfDelay: Infinity, terminal: false });
  lines.on("line", (line) => {
    const clean = stripVTControlCharacters(line);
    const match = /^(?:\d{4}-\d{2}-\d{2}T\S+\s+)?(TRACE|DEBUG|INFO|WARN|ERROR)\s+(.+)$/.exec(clean);
    const level = match ? (match[1].toLowerCase() as Level) : fallback;
    output[level](match ? match[2] : clean);
  });
}
