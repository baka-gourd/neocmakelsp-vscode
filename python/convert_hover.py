"""Render a CMake RST fragment with Sphinx and markdownify (no custom parser)."""
import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile


def convert(text):
    from sphinx.application import Sphinx
    from markdownify import markdownify

    with tempfile.TemporaryDirectory(prefix="neocmakelsp-hover-") as directory:
        root = Path(directory)
        source = root / "source"
        source.mkdir()
        (source / "index.rst").write_text(text, encoding="utf-8")
        messages = io.StringIO()
        # No project conf.py is evaluated and RST cannot include local files/raw HTML.
        with contextlib.redirect_stdout(messages):
            app = Sphinx(
                str(source), None, str(root / "out"), str(root / "doctrees"),
                "json", confoverrides={
                    "extensions": ["cmake", "sphinxcontrib.serializinghtml"],
                    "primary_domain": "cmake", "root_doc": "index",
                    "html_theme": "basic", "html_permalinks": False,
                }, status=None, warning=messages, freshenv=True,
            )
            app.env.settings.update(file_insertion_enabled=False, raw_enabled=False)
            app.build(force_all=True)
        body = json.loads((root / "out/index.fjson").read_text(encoding="utf-8"))["body"]
        # VS Code uses CommonMark, not Markdown Extra definition lists.
        return markdownify(body, heading_style="ATX", bullets="-", code_language="cmake",
                           strip=["dl", "dt", "dd"], escape_misc=True)


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent / "vendor"))
    try:
        payload = json.load(sys.stdin)
        print(json.dumps({"markdown": convert(payload["text"])}, ensure_ascii=True))
    except Exception as error:
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
