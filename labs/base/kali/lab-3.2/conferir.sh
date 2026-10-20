#!/usr/bin/env bash
# conferir.sh — derives the flag for Mission 2 of module 3.2 (Hashing, senhas e
# quebra de hashes). Reads the recovered plaintext passwords (one per line) from
# standard input, keeps the distinct ones in a fixed order and prints the flag.
#
# Usage, after cracking shadow.leak:
#   john --show shadow.leak | awk -F: 'NF>1 {print $2}' | /opt/lab-3.2/conferir.sh
#   hashcat -m 1800 shadow.leak --show | awk -F: '{print $NF}' | /opt/lab-3.2/conferir.sh
#   cat recovered.txt | /opt/lab-3.2/conferir.sh
#
# The flag depends on the PLAINTEXT passwords, which are not in this image (only
# the salted hashes are). Without cracking the hashes for real, the flag does
# not come out. The transform is deterministic: the same set of passwords always
# yields the same flag.
set -euo pipefail
joined="$(grep -v '^[[:space:]]*$' | LC_ALL=C sort -u)"
digest="$(printf '%s' "$joined" | sha256sum | cut -c1-12)"
echo "FLAG{sha512crypt_${digest}}"
