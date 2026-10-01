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
# Both are applied to the shipped conf; the build fails loudly if cgid is not
# enabled, so a broken image is never published as working.
RUN set -eux; \
    sed -i \
      -e 's|^#LoadModule cgid_module |LoadModule cgid_module |' \
      -e 's|^#LoadModule cgi_module |LoadModule cgi_module |' \
      conf/httpd.conf; \
    printf '\n# CVE-2021-41773 lab: open the server root (ships "Require all denied").\n<Directory />\n    AllowOverride none\n    Require all granted\n</Directory>\n' >> conf/httpd.conf; \
    grep -qE '^LoadModule cgid_module' conf/httpd.conf
