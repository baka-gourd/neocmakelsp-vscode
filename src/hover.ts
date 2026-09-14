import { execFile } from "node:child_process";
import * as vscode from "vscode";
import type { Middleware } from "vscode-languageclient/node";
import { selectedPython } from "./python-environment.js";

export function createHoverMiddleware(
  context: vscode.ExtensionContext,
  output: vscode.LogOutputChannel,
): Middleware {
  const cache = new Map<string, string>();
  let active = false;
  const failures = new Map<string, number>();
  return {
    provideHover: async (document, position, token, next) => {
      const hover = await next(document, position, token);
      if (
        !hover ||
        token.isCancellationRequested ||
        !vscode.workspace
          .getConfiguration("neocmakelsp", document.uri)
          .get<boolean>("hover.sphinx", true)
      )
        return hover;
      let command: string[] | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        command = await Promise.race([
          selectedPython(document.uri),
          new Promise<undefined>((resolve) => {
            timer = setTimeout(() => resolve(undefined), 2000);
          }),
        ]);
      } catch (error) {
        output.debug(`Python Environments API unavailable: ${String(error)}`);
      } finally {
        clearTimeout(timer);
      }
      if (!command?.length || token.isCancellationRequested) return hover;
      const commandKey = JSON.stringify(command);
      if (Date.now() - (failures.get(commandKey) ?? 0) < 30_000) return hover;
      for (const content of hover.contents) {
        if (
          !(content instanceof vscode.MarkdownString) ||
          !/(?:^\s*\.\.\s+[\w-]+::|:[\w-]+:`|^\s*\^{3,}\s*$)/m.test(content.value)
        )
          continue;
        if (content.value.length > 256_000) continue;
        const key = commandKey + content.value;
        const cached = cache.get(key);
        if (cached !== undefined) {
          content.value = cached;
          continue;
        }
        if (active) continue;
        active = true;
        try {
          const markdown = await new Promise<string>((resolve, reject) => {
            const process = execFile(
              command[0],
              [...command.slice(1), context.asAbsolutePath("python/convert_hover.py")],
              {
                timeout: 10_000,
                maxBuffer: 2 * 1024 * 1024,
                windowsHide: true,
                env: { ...globalThis.process.env, PYTHONIOENCODING: "utf-8" },
              },
              (error, stdout) => {
                if (error) {
                  reject(error);
                  return;
                }
                try {
                  const result = JSON.parse(stdout);
                  if (typeof result.markdown !== "string")
                    throw new Error("Invalid hover conversion response");
                  resolve(result.markdown);
                } catch (error) {
                  reject(error);
                }
              },
            );
            const cancellation = token.onCancellationRequested(() => process.kill());
            process.once("close", () => cancellation.dispose());
            process.stdin?.on("error", () => {
              /* execFile callback reports process failures */
            });
            process.stdin?.end(JSON.stringify({ text: content.value }));
            if (token.isCancellationRequested) process.kill();
          });
          if (token.isCancellationRequested) return hover;
          if (cache.size >= 32) cache.delete(cache.keys().next().value!);
          cache.set(key, markdown);
          content.value = markdown;
        } catch (error) {
          if (!token.isCancellationRequested) {
            if (failures.size >= 16) failures.clear();
            failures.set(commandKey, Date.now());
            output.warn(
              `Optional hover conversion unavailable in ${command[0]}; using original documentation. Install python/requirements.txt in the selected Python environment. Retrying after 30 seconds. ${String(error)}`,
            );
          }
        } finally {
          active = false;
        }
      }
      return hover;
    },
  };
}
