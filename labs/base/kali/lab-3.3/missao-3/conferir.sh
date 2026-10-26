#!/usr/bin/env bash
# conferir.sh — checks the SHAPE of the forged token for Mission 3 of module
# 3.3 (Criptografia simetrica) and prints the flag derived from it. There is no
# key in this image: the script cannot decrypt anything. It only confirms that
# the ciphertext is intact and that the IV changed inside the role value. A
# wrong forgery still prints a flag, and the platform rejects it.
#
# Usage: /opt/lab-3.3/missao-3/conferir.sh <token-base64>    (or the token on stdin)
set -euo pipefail

ORIGINAL_HEX="ee23e2a3c4cad7d9932672941a4c4422a2a1b1e7a84e070bc81654ebc28473a9d767673ec5842ba20b2273e5a8779149"

token="${1:-}"
if [ -z "$token" ]; then
    read -r token
fi

python3 - "$token" "$ORIGINAL_HEX" <<'PY'
import base64, binascii, hashlib, sys

token, original = sys.argv[1].strip(), bytes.fromhex(sys.argv[2])
try:
    forged = base64.b64decode(token, validate=True)
except (binascii.Error, ValueError):
    sys.exit("ERRO: o token nao e Base64 valido.")
if len(forged) != len(original):
    sys.exit(f"ERRO: o token tem {len(forged)} bytes; o original tem {len(original)} (IV de 16 + 32 de cifrado).")
if forged[16:] != original[16:]:
    sys.exit("ERRO: o texto cifrado (bytes 16 em diante) mudou. Nesta missao so o IV muda.")
changed = [i for i in range(16) if forged[i] != original[i]]
if not changed:
    sys.exit("ERRO: o token e identico ao original.")
outside = [i for i in changed if not 5 <= i <= 9]
if outside:
    sys.exit(f"ERRO: voce mudou os bytes {outside} do IV, fora do valor de 'role' (bytes 5 a 9).")
print(f"Formato ok: IV alterado nos bytes {changed}, cifrado intacto.")
print("FLAG{iv_flip_" + hashlib.sha256(forged).hexdigest()[:12] + "}")
print("(Sem a chave, este script nao sabe se a forja decifra para role=admin. Quem decide e a plataforma.)")
PY
