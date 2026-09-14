# Third-party notices

This project is independently maintained. The projects credited below are
sources of third-party code or implementation references, not upstream projects
of this extension. The project's MPL-2.0 license does not replace the notices
or license terms applicable to third-party material.

## neocmakelsp/neocmakelsp-vscode

Source: https://github.com/neocmakelsp/neocmakelsp-vscode

The following implementations were developed with reference to, or adapted from,
that revision. The original MIT notice is retained below for this material:

| Local file | Reference file and scope |
| --- | --- |
| `src/targets.ts` | `src/targets.ts`: custom target request, target data shape, tree and build/run integration |
| `src/debug.ts` | `src/debug.ts`, `src/extension.ts`: CMake debugger startup, named-pipe adapter and commands |
| `src/configuration.ts` | `src/util.ts`: environment/configuration variable substitution |
| `src/extension.ts` | `src/extension.ts`: snippet initialization option and cache-file notifications |
| `package.json` | `package.json`: corresponding settings, commands, target view and debugger contributions |

These implementations include local changes, such as VS Code process tasks,
configurable build directories, debugger lifecycle handling and a separate
debug adapter identifier. This attribution does not imply affiliation or endorsement.

```text
MIT License
Copyright (c) 2021 Decodetalkers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## CMake Sphinx extension

`python/vendor/cmake.py` is copied from CMake v4.2.3 and retains its BSD-3-Clause
license. Source details are in `python/vendor/README.md`; the complete copyright
and license notices are in `python/vendor/LICENSE.rst`. Both files are included
in the extension package.
