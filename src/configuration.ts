// References/adaptations: neocmakelsp/neocmakelsp-vscode (MIT).
// Copyright (c) 2021 Decodetalkers. See THIRD_PARTY_NOTICES.md.
import * as vscode from "vscode";
import * as path from "node:path";

export function expand(value: string, folder?: vscode.WorkspaceFolder): string {
  return value.replace(/\$\{([^}]+)\}/g, (match, key: string) => {
    if (key === "workspaceFolder") return folder?.uri.fsPath ?? match;
    if (key.startsWith("env:")) return process.env[key.slice(4)] ?? "";
    if (key.startsWith("config:")) {
      const setting = vscode.workspace.getConfiguration(undefined, folder?.uri).get(key.slice(7));
      return typeof setting === "string" ? setting : match;
    }
    return match;
  });
}

export function buildDirectory(folder: vscode.WorkspaceFolder): string {
  return path.resolve(
    folder.uri.fsPath,
    expand(
      vscode.workspace.getConfiguration("neocmakelsp", folder.uri).get("buildDirectory", "build"),
      folder,
    ),
  );
}

export async function selectFolder(uri?: vscode.Uri): Promise<vscode.WorkspaceFolder | undefined> {
  const active = uri ?? vscode.window.activeTextEditor?.document.uri;
  return (
    (active && vscode.workspace.getWorkspaceFolder(active)) ||
    (vscode.workspace.workspaceFolders?.length === 1
      ? vscode.workspace.workspaceFolders[0]
      : vscode.window.showWorkspaceFolderPick())
  );
}
