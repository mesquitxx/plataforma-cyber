#!/bin/sh
# Runs once, on the first boot of guac-db (after 01-schema.sql).
# - Replaces the default guacadmin/guacadmin password.
# - Creates the "Kali (attack box)" VNC connection.
# Guacamole stores password_hash = SHA-256(password + uppercase hex(salt)).
set -eu

: "${GUAC_ADMIN_PASSWORD:?GUAC_ADMIN_PASSWORD is required}"
: "${KALI_VNC_PASSWORD:?KALI_VNC_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -v admin_pw="$GUAC_ADMIN_PASSWORD" \
     -v vnc_pw="$KALI_VNC_PASSWORD" <<'SQL'
-- 32-byte salt from two v4 UUIDs (gen_random_uuid uses a CSPRNG).
WITH s AS (
    SELECT decode(replace(gen_random_uuid()::text, '-', '')
               || replace(gen_random_uuid()::text, '-', ''), 'hex') AS salt
)
UPDATE guacamole_user u
SET password_salt = s.salt,
    password_hash = sha256(convert_to(:'admin_pw' || upper(encode(s.salt, 'hex')), 'UTF8')),
    password_date = CURRENT_TIMESTAMP
FROM s, guacamole_entity e
WHERE u.entity_id = e.entity_id AND e.name = 'guacadmin' AND e.type = 'USER';

INSERT INTO guacamole_connection (connection_name, protocol)
VALUES ('Kali (attack box)', 'vnc');

INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
SELECT c.connection_id, p.name, p.value
FROM guacamole_connection c,
     (VALUES ('hostname', 'kali'),
             ('port', '5901'),
             ('password', :'vnc_pw'),
             ('color-depth', '24'),
             ('clipboard-encoding', 'UTF-8')) AS p(name, value)
WHERE c.connection_name = 'Kali (attack box)';

INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission)
SELECT e.entity_id, c.connection_id, p.perm::guacamole_object_permission_type
FROM guacamole_entity e,
     guacamole_connection c,
     (VALUES ('READ'), ('UPDATE'), ('DELETE'), ('ADMINISTER')) AS p(perm)
WHERE e.name = 'guacadmin' AND e.type = 'USER'
  AND c.connection_name = 'Kali (attack box)';
SQL
