import * as vscode from "vscode";

export function notifyCMakeToolsConflict(): vscode.Disposable {
  let notified = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const check = () => {
    if (notified || !vscode.extensions.getExtension("ms-vscode.cmake-tools")?.isActive) return;
    notified = true;
    clearInterval(timer);
    void vscode.window.showWarningMessage(
      vscode.env.language.toLowerCase().startsWith("zh")
        ? "neocmakelsp 和 CMake Tools 已同时激活，部分语言功能可能冲突。可按需在此工作区禁用其中一个扩展。"
        : "neocmakelsp and CMake Tools are both active. Some language features may conflict. You can disable either extension for this workspace if needed.",
    );
  };
  // Extension activation does not have a dedicated public event. Check for
  // delayed activation without calling activate() on CMake Tools ourselves.
  const listener = vscode.extensions.onDidChange(check);
  check();
  if (!notified) timer = setInterval(check, 5000);
  return new vscode.Disposable(() => { clearInterval(timer); listener.dispose(); });
}
