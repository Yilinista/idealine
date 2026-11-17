"""Seal a shared test API key with a code, so invited testers can use the site without a key.

The key is read from a hidden prompt and never written to disk in plain text. Only the AES-GCM ciphertext goes into
src/idealine/web/tester-key.json, which build_gallery.py inlines into the home page.

Anyone with the code can recover the key in their browser, so use a key with narrow
permissions and a small hard spend limit, and revoke it when testing ends.

    uv run --with cryptography python scripts/seal_key.py            # seal, print the code
    uv run python scripts/seal_key.py --remove                        # take the key off the site

Then rebuild: uv run python scripts/build_gallery.py
"""
from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import json
import os
import re
import secrets
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "idealine" / "web" / "tester-key.json"
ITERATIONS = 600_000
PROVIDERS = ("openai", "anthropic", "gemini", "openrouter")
ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"  # no 0/o, 1/l/i


def normalize(code: str) -> str:
    """Codes are typed by people: ignore case, spaces and dashes (same rule as the site)."""
    return re.sub(r"[^a-z0-9]", "", code.lower())


def new_code() -> str:
    """Three groups of four characters, about 59 bits: e.g. 'k7mq-x2ne-p9ta'."""
    return "-".join("".join(secrets.choice(ALPHABET) for _ in range(4)) for _ in range(3))


def seal(key: str, code: str, provider: str, salt: bytes | None = None, iv: bytes | None = None,
         iterations: int = ITERATIONS) -> dict:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    salt = salt or os.urandom(16)
    iv = iv or os.urandom(12)
    aes = hashlib.pbkdf2_hmac("sha256", normalize(code).encode(), salt, iterations, dklen=32)
    ct = AESGCM(aes).encrypt(iv, key.encode(), None)  # ciphertext followed by the 16-byte tag, as WebCrypto expects
    b64 = lambda b: base64.b64encode(b).decode()
    return {"v": 1, "provider": provider, "iter": iterations, "salt": b64(salt), "iv": b64(iv), "ct": b64(ct)}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--provider", default="openai", choices=PROVIDERS)
    ap.add_argument("--code", help="use this code instead of a generated one (at least 12 characters)")
    ap.add_argument("--remove", action="store_true", help="delete the sealed key from the site")
    args = ap.parse_args()

    if args.remove:
        if OUT.exists():
            OUT.unlink()
            print(f"Removed {OUT.name}. Rebuild the site, push, and revoke the key at the provider.")
        else:
            print("No sealed key on the site.")
        return

    key = getpass.getpass("Paste the test API key (hidden): ")
    key = key.strip()
    if not key:
        sys.exit("No key given.")
    code = args.code or new_code()
    if len(normalize(code)) < 12:
        sys.exit("Use a code of at least 12 letters or digits.")
    OUT.write_text(json.dumps(seal(key, code, args.provider)) + "\n", encoding="utf-8")
    print(f"Sealed a {args.provider} key into {OUT.relative_to(Path.cwd()) if OUT.is_relative_to(Path.cwd()) else OUT}.")
    print(f"Code for testers: {code}")
    print("Next: uv run python scripts/build_gallery.py, then commit and push.")


if __name__ == "__main__":
    main()
