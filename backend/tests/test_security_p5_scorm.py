"""Verify the actual exported SCO isolates generated resources from its shell."""

import os
import sys
from html.parser import HTMLParser
from io import BytesIO
from zipfile import ZipFile

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scorm.domain.package import build_scorm_zip_bytes  # noqa: E402


class Frames(HTMLParser):
    def __init__(self):
        super().__init__()
        self.frames = []

    def handle_starttag(self, tag, attrs):
        if tag == "iframe":
            self.frames.append(dict(attrs))


def test_exported_resources_have_opaque_origin_and_only_script_permission():
    content = "<html><body><script>window.quizWorks = true</script></body></html>"
    data = build_scorm_zip_bytes(phases=[{"order": 1, "type": "evaluate", "content": content}])
    with ZipFile(BytesIO(data)) as package:
        parser = Frames()
        parser.feed(package.read("index.html").decode())
        assert len(parser.frames) == 1
        frame = parser.frames[0]
        assert set(frame.get("sandbox", "").split()) == {"allow-scripts"}
        resource = package.read(frame["src"]).decode()
        assert resource.endswith("<body><script>window.quizWorks = true</script></body></html>")
        assert 'id="genova-package-theme"' in resource
        # The trusted parent shell, not the opaque resource, owns LMS tracking.
        shell = package.read("index.html").decode()
        assert '<script src="resources/scorm.js"></script>' in shell
        assert '<script src="resources/app.js"></script>' in shell
