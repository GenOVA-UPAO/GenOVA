"""Cliente HTTP fino para el harness E2E (mismo contrato que el frontend).

Mantiene la cookie ``genova_token`` en una ``requests.Session`` y expone helpers
que lanzan con el cuerpo de error en respuestas no-2xx, para que el harness
reporte el motivo real (no un stacktrace opaco).
"""

import requests


class ApiError(RuntimeError):
    def __init__(self, method: str, path: str, status: int, body: str):
        super().__init__(f"{method} {path} → {status}: {body[:500]}")
        self.status = status
        self.body = body


class ApiClient:
    def __init__(self, base_url: str, timeout: float = 30.0):
        self.base = base_url.rstrip("/")
        self.timeout = timeout
        self.s = requests.Session()
        self.token: str | None = None

    def _url(self, path: str) -> str:
        return path if path.startswith("http") else f"{self.base}{path}"

    def _check(self, r: requests.Response, method: str, path: str) -> requests.Response:
        if not r.ok:
            raise ApiError(method, path, r.status_code, r.text)
        return r

    def login(self, email: str, password: str) -> dict:
        r = self.s.post(
            self._url("/api/auth/login"),
            json={"email": email, "password": password},
            timeout=self.timeout,
        )
        self._check(r, "POST", "/api/auth/login")
        data = r.json()
        # La cookie httpOnly es Secure cuando COOKIE_SAMESITE=none, y `requests`
        # no la envía sobre http://localhost. Usamos el Bearer del cuerpo
        # (requiere AUTH_ACCEPT_BEARER=1 en el contenedor; ver docker-compose.e2e.yml).
        self.token = data.get("access_token")
        if self.token:
            self.s.headers["Authorization"] = f"Bearer {self.token}"
        return data

    def get(self, path: str, **params) -> dict:
        r = self.s.get(self._url(path), params=params or None, timeout=self.timeout)
        self._check(r, "GET", path)
        return r.json()

    def put(self, path: str, json: dict) -> dict:
        r = self.s.put(self._url(path), json=json, timeout=self.timeout)
        self._check(r, "PUT", path)
        return r.json()

    def post(self, path: str, json: dict | None = None) -> dict:
        r = self.s.post(self._url(path), json=json, timeout=self.timeout)
        self._check(r, "POST", path)
        return r.json()

    def post_files(self, path: str, files: list) -> dict:
        """Multipart POST. ``files`` = list of (field, (filename, bytes, mime))."""
        r = self.s.post(self._url(path), files=files, timeout=max(self.timeout, 120))
        self._check(r, "POST", path)
        return r.json()

    def download(self, path: str) -> bytes:
        """GET que sigue el 302 a signed_url (Supabase) o devuelve el FileResponse."""
        r = self.s.get(self._url(path), timeout=max(self.timeout, 120), allow_redirects=True)
        self._check(r, "GET", path)
        return r.content
