"""Per-email login throttle — complements the per-IP slowapi limiter.

In-memory only — fine for single Render instance; needs Redis when scaling
horizontally.  Blocks a distributed attacker that rotates IPs against one
account.
"""

import threading
import time
from collections import defaultdict, deque

EMAIL_LOGIN_WINDOW_S = 60.0
EMAIL_LOGIN_MAX = 5
_email_attempts: dict[str, deque[float]] = defaultdict(deque)
_email_attempts_lock = threading.Lock()


def email_throttled(email: str) -> bool:
    """Return True if *email* has exceeded login attempts within the window."""
    now = time.monotonic()
    with _email_attempts_lock:
        q = _email_attempts[email]
        while q and now - q[0] > EMAIL_LOGIN_WINDOW_S:
            q.popleft()
        if len(q) >= EMAIL_LOGIN_MAX:
            return True
        q.append(now)
        return False
