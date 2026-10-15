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
