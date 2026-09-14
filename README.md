# neocmakelsp for VS Code

`neocmakelsp` is a CMake language server that provides features like completion, diagnostics, go-to-definition, hover, and formatting for CMake files in VS Code. This extension uses the locally installed `neocmakelsp`.

## Features

When this extension and `ms-vscode.cmake-tools` are both active, a warning about potentially overlapping language features is shown once per activation. Delayed activation of CMake Tools is also detected. Neither extension is stopped, and no settings are changed.

- CMake and CMake Cache syntax highlighting, semantic tokens, document outline, references and rename via LSP.
- `neocmakelsp.lsp_snippets`: optional language-server completion snippets.
- CMakeCache.txt file-change notifications to the language server.
- Explorer **CMake Targets**: refresh, build targets and run executable artifacts using VS Code tasks. Requires a server supporting `neocmake/cmake_targets` and generated CMake File API codemodel data. Run CMake configuration first, then refresh the view. An empty view can mean the server has no codemodel data.
- `neocmakelsp.buildDirectory`: build/artifact directory, default `build`. Set this to the directory used to configure your project. The server's target request does not take a workspace argument; targets currently use the first workspace root.
- `neocmakelsp.debug`: show commands for debugging the current CMake script or workspace configuration. Requires CMake 3.27+ built with debugger support, available as `cmake` on PATH. No Python environment is needed for debugging.
- Executable paths support `${env:NAME}` and `${config:setting}`; `${workspaceFolder}` is also supported.
