import * as vscode from "vscode";
import type { Middleware, vsdiag } from "vscode-languageclient/node";

function filter(uri: vscode.Uri, items: vscode.Diagnostic[]): vscode.Diagnostic[] {
  const ignored = new Set(
    vscode.workspace
      .getConfiguration("neocmakelsp", uri)
      .get<string[]>("diagnostics.ignoredCodes", [])
      .map((code) => code.trim().toUpperCase()),
  );
  return items.filter((item) => {
    const raw = typeof item.code === "object" ? item.code.value : item.code;
    const code = raw ?? /^\[([A-Za-z]\d+)\]/.exec(item.message)?.[1];
    return code === undefined || !ignored.has(String(code).toUpperCase());
  });
}

function filterReport(uri: vscode.Uri, report: vsdiag.DocumentDiagnosticReport): void {
  if (report.kind === "full") report.items = filter(uri, report.items);
  for (const [relatedUri, related] of Object.entries(report.relatedDocuments ?? {})) {
    if (related.kind === "full")
      related.items = filter(vscode.Uri.parse(relatedUri), related.items);
  }
}

export const diagnosticMiddleware: Middleware = {
  handleDiagnostics: (uri, items, next) => next(uri, filter(uri, items)),
  provideDiagnostics: async (document, previousId, token, next) => {
    const report = await next(document, previousId, token);
    if (report) filterReport(document instanceof vscode.Uri ? document : document.uri, report);
    return report;
  },
  provideWorkspaceDiagnostics: async (ids, token, reporter, next) => {
    const filterWorkspace = (report: vsdiag.WorkspaceDiagnosticReport) => {
      for (const item of report.items) filterReport(item.uri, item);
    };
    const report = await next(ids, token, (chunk) => {
      if (chunk) filterWorkspace(chunk);
      reporter(chunk);
    });
    if (report) filterWorkspace(report);
    return report;
  },
};
