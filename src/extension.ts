import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { forwardServerLog } from "./server-log.js";
import { diagnosticMiddleware } from "./diagnostics.js";
import { createHoverMiddleware } from "./hover.js";

let client: LanguageClient | undefined;
let pending: Promise<void> = Promise.resolve();
let disposed = false;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  disposed = false;
  const output = vscode.window.createOutputChannel("neocmakelsp", { log: true });
  context.subscriptions.push(output);

  const restart = (): Promise<void> => {
    pending = pending
      .then(async () => {
        await client?.dispose();
        client = undefined;
        if (disposed) return;

        const command = vscode.workspace
          .getConfiguration("neocmakelsp")
          .get<string>("path", "neocmakelsp")
          .trim();
        if (!command) throw new Error("neocmakelsp.path must not be empty.");

        client = new LanguageClient(
          "neocmakelsp",
          "neocmakelsp",
          {
            command,
            args: ["stdio"],
          },
          {
            documentSelector: [{ scheme: "file", language: "cmake" }],
            initializationOptions: {
              semantic_token: true,
              format: { enable: true },
              lint: { enable: true },
              scan_cmake_in_package: true,
            },
            outputChannel: output,
            middleware: { ...diagnosticMiddleware, ...createHoverMiddleware(context, output) },
            stdioOptions: {
              stdout: (input, channel) => forwardServerLog(input, channel, "info"),
              stderr: (input, channel) => forwardServerLog(input, channel, "error"),
            },
          },
        );
        await client.start();
        output.info(`Started ${command} stdio`);
      })
      .catch(async (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        output.error(`Failed to start neocmakelsp: ${message}`);
        void vscode.window
          .showErrorMessage(
            "Unable to start neocmakelsp. Install it on PATH or set neocmakelsp.path to its executable.",
            "Open Settings",
            "Show Output",
          )
          .then((action) => {
            if (action === "Open Settings") {
              void vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "neocmakelsp.path",
              );
            } else if (action === "Show Output") {
              output.show();
            }
          });
      });
    return pending;
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("neocmakelsp.restart", restart),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("neocmakelsp.path") ||
        event.affectsConfiguration("neocmakelsp.diagnostics.ignoredCodes") ||
        event.affectsConfiguration("neocmakelsp.hover.sphinx")
      )
        void restart();
    }),
  );
  await restart();
}

export async function deactivate(): Promise<void> {
  disposed = true;
  await pending;
  await client?.dispose();
  client = undefined;
}
