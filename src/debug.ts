// References/adaptations: neocmakelsp/neocmakelsp-vscode (MIT).
// Copyright (c) 2021 Decodetalkers. See THIRD_PARTY_NOTICES.md.
import * as vscode from "vscode";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { buildDirectory, selectFolder } from "./configuration.js";

export function registerDebug(context: vscode.ExtensionContext, output: vscode.LogOutputChannel) {
  const children = new Map<string, ChildProcess>();
  context.subscriptions.push({
    dispose: () => {
      for (const child of children.values()) child.kill();
      children.clear();
    },
  });
  context.subscriptions.push(
    vscode.debug.onDidTerminateDebugSession((session) => {
      children.get(session.id)?.kill();
      children.delete(session.id);
    }),
  );
  // A distinct adapter type avoids taking over CMake Tools' "cmake" adapter.
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory("neocmakelsp", {
      async createDebugAdapterDescriptor(session) {
        if (!vscode.workspace.isTrusted) throw new Error("Workspace trust is required.");
        const folder = session.workspaceFolder;
        const config = session.configuration;
        const cwd = config.cwd ?? folder?.uri.fsPath;
        if (!cwd) throw new Error("Open a workspace or specify cwd.");
        const pipe =
          config.pipeName ??
          (process.platform === "win32"
            ? `\\\\.\\pipe\\neocmakelsp-${randomUUID()}`
            : path.join(tmpdir(), `neocmake-${randomUUID()}.sock`));
        const args = ["--debugger", "--debugger-pipe", pipe];
        if (config.cmakeDebugType === "script") {
          if (!config.scriptPath) throw new Error("scriptPath is required for script debugging.");
          args.push(...(config.scriptArgs ?? []), "-P", config.scriptPath);
        } else {
          args.push(
            "-S",
            cwd,
            "-B",
            config.buildDirectory ?? (folder ? buildDirectory(folder) : path.join(cwd, "build")),
            ...(config.scriptArgs ?? []),
          );
        }
        const child = spawn("cmake", args, {
          cwd,
          env: { ...process.env, ...config.env },
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        children.set(session.id, child);
        try {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(
              () => finish(new Error("CMake debugger startup timed out (15s).")),
              15000,
            );
            let settled = false;
            let buffer = "";
            const finish = (error?: Error) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              error ? reject(error) : resolve();
            };
            const read = (chunk: Buffer) => {
              output.append(chunk.toString());
              buffer = (buffer + chunk.toString()).slice(-8192);
              if (buffer.includes("Waiting for debugger client to connect")) finish();
            };
            child.stdout.on("data", read);
            child.stderr.on("data", read);
            child.on("error", (error) => finish(error));
            child.on("exit", (code) => {
              children.delete(session.id);
              finish(new Error(`CMake exited before debugger connection (${code}).`));
            });
          });
          return new vscode.DebugAdapterNamedPipeServer(pipe);
        } catch (error) {
          child.kill();
          children.delete(session.id);
          throw error;
        }
      },
    }),
  );
  for (const mode of ["Script", "Configure"] as const) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        `neocmakelsp.run${mode}Debugger`,
        async (uri?: vscode.Uri) => {
          if (!vscode.workspace.isTrusted) return;
          const document = vscode.window.activeTextEditor?.document;
          const script = uri ?? document?.uri;
          if (mode === "Script" && (!script || script.scheme !== "file")) return;
          if (mode === "Script" && document?.isDirty && !(await document.save())) return;
          const folder = await selectFolder(script);
          if (!folder) return;
          return vscode.debug.startDebugging(folder, {
            type: "neocmakelsp",
            request: "launch",
            name: `CMake ${mode}`,
            cmakeDebugType: mode.toLowerCase(),
            scriptPath: mode === "Script" ? script?.fsPath : undefined,
          });
        },
      ),
    );
  }
}
