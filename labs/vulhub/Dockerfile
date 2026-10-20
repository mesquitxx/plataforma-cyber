# PROVISIONAL Vulhub-style target (Fase 7): Apache httpd 2.4.49, vulnerable to
# CVE-2021-41773 (path traversal -> RCE when mod_cgi(d) is enabled and the
# server root grants access). This is a faithful reproduction of the consagrado
# Vulhub environment (vulhub/vulhub, httpd/CVE-2021-41773), rebuilt on the
# OFFICIAL httpd image pinned by digest instead of a community image.
#
# The final CVE for the `vulhub` lab is still MESQUITA's decision (three
# candidates in docs/CURRICULO.md, Trilha 5). Replace this folder with the
# chosen environment when decided. Nothing here is custom exploit code: only the
# two well-known misconfigurations the CVE needs.
FROM httpd:2.4.49@sha256:dcba0d12e2362fb0c50ec524ae8aa1cca4a4ba7216617a57e7bbca20767e79cc

# The CVE needs exactly two changes over the stock configuration:
#  1. load mod_cgid and mod_cgi, so the traversal can reach an interpreter;
#  2. grant access to the server root ("<Directory />"), which ships denied.
# In this image the cgid/cgi LoadModule lines ship commented AND tab-indented
# inside <IfModule> blocks, so the regex tolerates leading whitespace. Both are
# applied to the shipped conf; the build fails loudly if cgid is not enabled, so
# a broken image is never published as working.
RUN set -eux; \
    sed -i -E \
      -e 's|^([[:space:]]*)#(LoadModule cgid_module )|\1\2|' \
      -e 's|^([[:space:]]*)#(LoadModule cgi_module )|\1\2|' \
      conf/httpd.conf; \
    printf '\n# CVE-2021-41773 lab: open the server root (ships "Require all denied").\n<Directory />\n    AllowOverride none\n    Require all granted\n</Directory>\n' >> conf/httpd.conf; \
    grep -qE '^[[:space:]]*LoadModule cgid_module' conf/httpd.conf

# --- Module 5.1 enumeration surface (BENIGN; not part of the CVE) ---
# Service enumeration "in depth" needs a real surface to map. We add classic
# information-disclosure misconfigurations (NOT exploits, NOT custom malware):
#   1. ServerTokens Full, so the banner leaks the full "Apache/2.4.49 (Unix)"
#      (this is the stock default, set explicitly to document the intent);
#   2. a response header (mod_headers, already loaded) that leaks an internal
#      path, and a browsable directory (mod_autoindex, already loaded) holding a
#      benign service inventory.
# Everything here is reached with a plain GET; the CVE-2021-41773 config above is
# left untouched, so modules 5.2-5.4 keep working. The flag is assembled by the
# learner from what they enumerate (version + CVE + sha256 of the inventory),
# so no secret token is stored here.
RUN set -eux; \
    grep -qE '^LoadModule headers_module' conf/httpd.conf; \
    grep -qE '^LoadModule autoindex_module' conf/httpd.conf; \
    printf '\n# 5.1 lab: leak the full version banner (stock default, made explicit).\nServerTokens Full\n# 5.1 lab: leak an internal path through a response header (information disclosure).\nHeader set X-Backend-Config "/internal/"\n# 5.1 lab: allow directory listing of /internal (benign info disclosure).\n<Directory "/usr/local/apache2/htdocs/internal">\n    Options +Indexes\n    Require all granted\n</Directory>\n' >> conf/httpd.conf; \
    mkdir -p htdocs/internal; \
    printf '# internal service inventory (lab only; do not expose in production)\nhost: vulhub\nservice: apache-httpd\nrole: legacy static content server\nnote: version pinned for the service-enumeration exercise\nowner: ops-team\nreview: pending\n' > htdocs/internal/service-inventory.txt; \
    httpd -t

# --- Module 5.5 password-attack surface (BENIGN; weak credentials, no exploit) ---
# Password attacks need a real authenticated service to attack. We protect a
# small /admin area with HTTP Basic Auth, backed by an Apache .htpasswd holding
# DELIBERATELY WEAK passwords (classic entries present in common wordlists).
# This is a vulnerable-by-design misconfiguration (weak credentials), NOT exploit
# code and NOT malware. Three accounts, two of which reuse one password, make
# password spraying and credential reuse realistic.
#   - The .htpasswd stores APR1 ($apr1$) hashes with FIXED salts (pre-computed
#     with `openssl passwd -apr1`), so the file is byte-for-byte reproducible:
#     module 5.5's flag is assembled from the cracked admin password and the
#     sha256 of this file, the same "assemble what you obtained" style as 5.1/5.2
#     (no secret token is stored). The cleartext passwords are NOT in this image;
#     only the hashes are, so the flag is not readable from the repo without
#     doing the crack.
#   - The flag is only reachable by (a) guessing a password online (hydra brute
#     force / password spraying) or (b) reading this .htpasswd through the module
#     5.2 foothold and cracking the APR1 hashes offline (john/hashcat).
#   - mod_auth_basic/authn_core/authn_file/authz_user ship loaded in this image;
#     the sed is a no-op if so and uncomments them otherwise (same tolerant
#     pattern as the cgid lines). The build asserts auth_basic is loaded and that
#     httpd -t passes, so a broken image is never published.
RUN set -eux; \
    sed -i -E \
      -e 's|^([[:space:]]*)#(LoadModule auth_basic_module )|\1\2|' \
      -e 's|^([[:space:]]*)#(LoadModule authn_core_module )|\1\2|' \
      -e 's|^([[:space:]]*)#(LoadModule authn_file_module )|\1\2|' \
      -e 's|^([[:space:]]*)#(LoadModule authz_user_module )|\1\2|' \
      conf/httpd.conf; \
    grep -qE '^[[:space:]]*LoadModule auth_basic_module' conf/httpd.conf; \
    printf 'admin:$apr1$L4b5x5Aa$bJXPX7bqGkv5VO0Ah8yIX.\njsmith:$apr1$L4b5x5Bb$ZjBhI/CeFAbNgtz4CTabY.\noperator:$apr1$L4b5x5Cc$Ryjv33q1AzOM92nrTEjka.\n' > conf/.htpasswd; \
    mkdir -p htdocs/admin; \
    printf '<!doctype html>\n<title>Admin</title>\n<h1>Restricted admin area</h1>\n<p>Authorised staff only.</p>\n' > htdocs/admin/index.html; \
    printf '\n# 5.5 lab: HTTP Basic Auth over /admin, weak credentials in conf/.htpasswd.\n<Directory "/usr/local/apache2/htdocs/admin">\n    AuthType Basic\n    AuthName "Restricted Admin Area"\n    AuthUserFile /usr/local/apache2/conf/.htpasswd\n    Require valid-user\n</Directory>\n' >> conf/httpd.conf; \
    httpd -t
