// References/adaptations: neocmakelsp/neocmakelsp-vscode (MIT).
// Copyright (c) 2021 Decodetalkers. See THIRD_PARTY_NOTICES.md.
import * as vscode from "vscode";
import * as path from "node:path";
import type { LanguageClient } from "vscode-languageclient/node";
import { buildDirectory } from "./configuration.js";

interface Target {
  name: string;
  build_type: string;
  info: { type: string; artifacts?: { path: string }[] };
}

export class Targets implements vscode.TreeDataProvider<Target>, vscode.Disposable {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;
  private targets: Target[] = [];
  private generation = 0;
  constructor(
    private readonly getClient: () => LanguageClient | undefined,
    private readonly output: vscode.LogOutputChannel,
  ) {}
  dispose() {
    this.generation++;
    this.changed.dispose();
  }
  getChildren(element?: Target) {
    return element ? [] : this.targets;
  }
  getTreeItem(target: Target) {
    const item = new vscode.TreeItem(target.name);
    item.description = target.build_type;
    item.tooltip = `${target.name} (${target.info.type})`;
    item.contextValue = target.info.type === "EXECUTABLE" ? "executable" : "library";
    return item;
  }
  async refresh() {
    const generation = ++this.generation;
    const client = this.getClient();
    this.targets = [];
    this.changed.fire();
    if (!client?.isRunning()) return;
    try {
      const result = await client.sendRequest<Record<string, Target> | null>(
        "neocmake/cmake_targets",
      );
      if (generation !== this.generation || client !== this.getClient()) return;
      this.targets = Object.values(result ?? {});
      this.changed.fire();
    } catch (error) {
      this.output.warn(`CMake targets unavailable: ${String(error)}`);
    }
  }
  async execute(target: Target | undefined, run: boolean) {
    if (!vscode.workspace.isTrusted || !target || !this.targets.includes(target)) return;
    // The server's custom request has no workspace parameter and returns targets for its root.
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return;
    const build = buildDirectory(folder);
    const artifact = target.info.artifacts?.[0];
    if (run && (!artifact || target.info.type !== "EXECUTABLE")) return;
    const args = ["--build", build, "--target", target.name];
    if (target.build_type) args.push("--config", target.build_type);
    const execution = run
      ? new vscode.ProcessExecution(path.resolve(build, artifact!.path), [], { cwd: build })
      : new vscode.ProcessExecution("cmake", args, { cwd: folder.uri.fsPath });
    const task = new vscode.Task(
      { type: "neocmakelsp" },
      folder,
      `${run ? "Run" : "Build"} ${target.name}`,
      "neocmakelsp",
      execution,
    );
    task.presentationOptions = { reveal: vscode.TaskRevealKind.Always };
    await vscode.tasks.executeTask(task);
  }
}
