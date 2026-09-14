// Portions reference neocmakelsp/neocmakelsp-vscode (MIT).
// Copyright (c) 2021 Decodetalkers. See THIRD_PARTY_NOTICES.md for scope.
import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { forwardServerLog } from "./server-log.js";
import { diagnosticMiddleware } from "./diagnostics.js";
import { createHoverMiddleware } from "./hover.js";
import { expand } from "./configuration.js";
import { Targets } from "./targets.js";
import { registerDebug } from "./debug.js";
import { notifyCMakeToolsConflict } from "./coexistence.js";

let client: LanguageClient | undefined;
let pending: Promise<void> = Promise.resolve();
let disposed = false;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  disposed = false;
  const output = vscode.window.createOutputChannel("neocmakelsp", { log: true });
  context.subscriptions.push(output);
  registerDebug(context, output);
  const targets = new Targets(() => client, output);
  const watcher = vscode.workspace.createFileSystemWatcher("**/CMakeCache.txt");
  context.subscriptions.push(targets, watcher,
    vscode.window.createTreeView("neocmakelsp.cmakeTargets", { treeDataProvider: targets }),
    vscode.commands.registerCommand("neocmakelsp.cmakeTargets", () => targets.refresh()),
    vscode.commands.registerCommand("neocmakelsp.cmakeTargets.refreshEntry", () => targets.refresh()),
    vscode.commands.registerCommand("neocmakelsp.cmakeTargets.build", target => targets.execute(target, false)),
    vscode.commands.registerCommand("neocmakelsp.cmakeTargets.run", target => targets.execute(target, true)),
  );

  const restart = (): Promise<void> => {
    pending = pending
      .then(async () => {
        await client?.dispose();
        client = undefined;
        void targets.refresh();
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
            command: expand(command, vscode.workspace.workspaceFolders?.[0]),
            args: ["stdio"],
          },
          {
            documentSelector: [{ scheme: "file", language: "cmake" }],
            synchronize: { fileEvents: watcher },
            initializationOptions: {
              semantic_token: true,
              use_snippets: vscode.workspace.getConfiguration("neocmakelsp").get("lsp_snippets", false),
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
        void targets.refresh();
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
        event.affectsConfiguration("neocmakelsp.lsp_snippets") ||
        event.affectsConfiguration("neocmakelsp.diagnostics.ignoredCodes") ||
        event.affectsConfiguration("neocmakelsp.hover.sphinx")
      )
        void restart();
    }),
  );
  await restart();
  context.subscriptions.push(notifyCMakeToolsConflict());
}

export async function deactivate(): Promise<void> {
  disposed = true;
  await pending;
  await client?.dispose();
  client = undefined;
}
