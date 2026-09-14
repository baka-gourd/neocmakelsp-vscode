import * as vscode from "vscode";

// Public API subset: microsoft/vscode-python-environments/src/api.ts.
interface PythonEnvironmentsApi {
  getEnvironment(scope: vscode.Uri): Promise<
    | {
        execInfo: { run: { executable: string; args?: string[] } };
      }
    | undefined
  >;
}

export async function selectedPython(uri: vscode.Uri): Promise<string[] | undefined> {
  const extension = vscode.extensions.getExtension<PythonEnvironmentsApi | undefined>(
    "ms-python.vscode-python-envs",
  );
  if (!extension) return undefined;
  if (!extension.isActive) await extension.activate();
  const api = extension.exports;
  if (!api) return undefined;
  const environment = await api.getEnvironment(uri);
  const run = environment?.execInfo.run;
  return run ? [run.executable, ...(run.args ?? [])] : undefined;
}
