#!/usr/bin/env bash
# The single entry point that starts, stops and resets labs (Phase 6). Used by
# the terminal and by the platform, which runs it with a fixed argument list
# (lib/labs/runner.ts). Labs are the closed list in scripts/lab-common.sh.
#
# Usage: scripts/lab.sh <command> [lab]
#   list            labs this script can run: slug, kind, project, files
#   status          every Compose container: name, project, service, state, health, lab
#   up <lab>        start a lab (refuses if another lab is running)
#   down <lab>      stop a lab and remove its containers and networks (keeps data)
#   switch <lab>    stop the lab that is running, then start <lab>
#   reset <lab>     recreate the lab's target from scratch, then start it
#                   (Kali's /home/kali is always kept)
#   verify <lab>    prove the isolation rules (the lab must be running)
# Terminal only (refused when CYBERLAB_CALLER=platform):
#   pull <lab>      download and build the lab's images (uses the internet)
#   rebuild <lab>   rebuild locally built images with fresh packages (internet)
#   purge <lab>     down, then delete every volume of the lab, including
#                   /home/kali and the Guacamole database
#   backup-home     save /home/kali (without caches) and labs/.env to
#                   data/backups/lab-<time>/ and to the Windows backup folder
#   restore-home <backup dir> --yes [--with-env]
#                   put a backup-home back into /home/kali (and labs/.env)
#
# Exit codes: 0 ok, 1 failure, 2 usage, 3 missing image, 4 another operation
# is running, 5 another lab is running, 6 command refused for the platform.
set -euo pipefail
source "$(dirname "$0")/lab-common.sh"

usage() {
    sed -n '6,27p' "$0" >&2
    exit 2
}

command="${1:-}"
lab="${2:-}"

# ---------- Read-only commands (no lock) ----------

case "$command" in
    list)
        for slug in "${LAB_SLUGS[@]}"; do
            printf '%s\t%s\t%s\t%s\n' "$slug" "${LAB_KIND[$slug]}" "${LAB_PROJECT_OF[$slug]}" \
                "$(echo ${LAB_FILES[$slug]} | tr ' ' ',')"
        done
        exit 0
        ;;
    status)
        lab_containers
        exit 0
        ;;
    up | down | switch | reset | verify | pull | rebuild | purge | backup-home | restore-home) ;;
    *) usage ;;
esac

case "$command" in
    backup-home | restore-home) ;;  # no lab argument
    *) lab_is_known "$lab" || { echo "Unknown lab: '${lab}'. Known: ${LAB_SLUGS[*]}" >&2; exit 2; } ;;
esac

case "$command" in
    pull | rebuild | purge | backup-home | restore-home)
        if [ "${CYBERLAB_CALLER:-}" = platform ]; then
            echo "'$command' only runs from a terminal (it uses the internet, or reads or replaces Kali's files)." >&2
            exit 6
        fi
        ;;
esac

# One operation at a time, whether it comes from the terminal or the platform.
mkdir -p "$(dirname "$LAB_LOCK")"
exec 9>"$LAB_LOCK"
if ! flock -n 9; then
    echo "Another lab operation is running. Wait for it to finish and try again." >&2
    exit 4
fi

# ---------- Helpers ----------

random_secret() {
    head -c 64 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c "$1"
}

# Creates labs/.env with random passwords, or adds the ones a newer phase
# introduced. Existing values are never changed (the databases keep them).
ensure_env() {
    umask 077
    if [ ! -f "$LAB_ENV" ]; then
        echo "==> Creating labs/.env with random passwords"
        cat > "$LAB_ENV" <<EOF
GUAC_DB_PASSWORD=$(random_secret 32)
GUAC_ADMIN_PASSWORD=$(random_secret 20)
KALI_VNC_PASSWORD=$(random_secret 8)
KALI_VNC_GEOMETRY=1600x900
DVWA_DB_PASSWORD=$(random_secret 32)
DVWA_DB_ROOT_PASSWORD=$(random_secret 32)
EOF
    fi
    if ! grep -q '^PLATFORM_GUAC_PASSWORD=' "$LAB_ENV"; then
        echo "==> Adding PLATFORM_GUAC_PASSWORD to labs/.env"
        echo "PLATFORM_GUAC_PASSWORD=$(random_secret 32)" >> "$LAB_ENV"
    fi
}

# RAM rule: one lab at a time. Refuses if anything but <lab> is running.
refuse_if_other_lab() {
    local others foreign
    others="$(lab_running_labs | grep -vx "$1" || true)"
    foreign="$(lab_foreign_running)"
    if [ -n "$others$foreign" ]; then
        echo "Another lab is running (one lab at a time):" >&2
        [ -n "$others" ] && echo "$others" | sed 's/^/  lab: /' >&2
        [ -n "$foreign" ] && echo "$foreign" | sed 's/^/  container: /' >&2
        echo "Stop it first, e.g. scripts/lab.sh down <lab>" >&2
        exit 5
    fi
}

# The platform's own Guacamole user: READ on the "Kali (attack box)"
# connection and nothing else (no system, user or group permissions). Its
# password lives in labs/.env (PLATFORM_GUAC_PASSWORD) and is re-applied on
# every start, so the user is recreated if the Guacamole database is new.
ensure_platform_user() {
    echo "==> Ensuring the restricted Guacamole user 'plataforma'"
    local pw
    pw="$(lab_env_value PLATFORM_GUAC_PASSWORD)"
    # Generated as alphanumeric; anything else could break the quoting below.
    if ! [[ "$pw" =~ ^[A-Za-z0-9]{16,}$ ]]; then
        echo "PLATFORM_GUAC_PASSWORD in labs/.env must be 16+ letters and digits" >&2
        exit 1
    fi
    # The password goes through stdin, never through a command line.
    { printf "\\set pw '%s'\n" "$pw"; cat; } <<'SQL' |
BEGIN;
INSERT INTO guacamole_entity (name, type) VALUES ('plataforma', 'USER')
ON CONFLICT (type, name) DO NOTHING;

WITH e AS (SELECT entity_id FROM guacamole_entity WHERE name = 'plataforma' AND type = 'USER'),
     s AS (SELECT decode(replace(gen_random_uuid()::text, '-', '')
                      || replace(gen_random_uuid()::text, '-', ''), 'hex') AS salt)
INSERT INTO guacamole_user (entity_id, password_hash, password_salt, password_date)
SELECT e.entity_id, sha256(convert_to(:'pw' || upper(encode(s.salt, 'hex')), 'UTF8')), s.salt, now()
FROM e, s
ON CONFLICT (entity_id) DO UPDATE
SET password_hash = EXCLUDED.password_hash, password_salt = EXCLUDED.password_salt,
    password_date = EXCLUDED.password_date, disabled = false, expired = false;

-- Start from no permissions at all, then grant exactly one.
DELETE FROM guacamole_system_permission           WHERE entity_id IN (SELECT entity_id FROM guacamole_entity WHERE name = 'plataforma' AND type = 'USER');
DELETE FROM guacamole_user_permission             WHERE entity_id IN (SELECT entity_id FROM guacamole_entity WHERE name = 'plataforma' AND type = 'USER');
DELETE FROM guacamole_user_group_permission       WHERE entity_id IN (SELECT entity_id FROM guacamole_entity WHERE name = 'plataforma' AND type = 'USER');
DELETE FROM guacamole_connection_group_permission WHERE entity_id IN (SELECT entity_id FROM guacamole_entity WHERE name = 'plataforma' AND type = 'USER');
DELETE FROM guacamole_sharing_profile_permission  WHERE entity_id IN (SELECT entity_id FROM guacamole_entity WHERE name = 'plataforma' AND type = 'USER');
DELETE FROM guacamole_user_group_member           WHERE member_entity_id IN (SELECT entity_id FROM guacamole_entity WHERE name = 'plataforma' AND type = 'USER');
DELETE FROM guacamole_connection_permission       WHERE entity_id IN (SELECT entity_id FROM guacamole_entity WHERE name = 'plataforma' AND type = 'USER');

INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission)
SELECT e.entity_id, c.connection_id, 'READ'
FROM guacamole_entity e, guacamole_connection c
WHERE e.name = 'plataforma' AND e.type = 'USER' AND c.connection_name = 'Kali (attack box)';
COMMIT;
SQL
        lab_compose_of "$lab" exec -T guac-db psql -q -v ON_ERROR_STOP=1 -U guacamole -d guacamole
}

# DVWA needs its database tables created once ("Create / Reset Database").
# Only when they are missing: running it again would wipe the target's state.
init_dvwa_db() {
    users_table() {
        lab_compose_of "$lab" exec -T dvwa-db sh -c \
            'mariadb -udvwa -p"$MARIADB_PASSWORD" -N -e "SHOW TABLES LIKE '\''users'\''" dvwa'
    }
    echo "==> Initialising the DVWA database (if needed)"
    if [ "$(users_table)" = "users" ]; then
        echo "DVWA database already initialised"
        return
    fi
    # Done from inside Kali, the only machine that can reach DVWA.
    lab_compose_of "$lab" exec -T kali bash -s <<'EOF'
set -euo pipefail
jar="$(mktemp)"
trap 'rm -f "$jar"' EXIT
token="$(curl -s -c "$jar" -b "$jar" http://dvwa/setup.php \
    | grep -oP "name='user_token' value='\K[0-9a-f]+")"
curl -s -o /dev/null -c "$jar" -b "$jar" \
    --data-urlencode "create_db=Create / Reset Database" \
    --data-urlencode "user_token=$token" \
    http://dvwa/setup.php
EOF
    if [ "$(users_table)" != "users" ]; then
        echo "DVWA database setup failed: open http://dvwa/setup.php inside Kali" >&2
        exit 1
    fi
    echo "DVWA database created"
}

summary() {
    echo
    echo "Lab '$lab' is up."
    case "${LAB_KIND[$lab]}" in
        desktop)
            echo "  Kali desktop: open the lab in the platform (http://127.0.0.1:3000/laboratorios)"
            echo "  or http://127.0.0.1:8080/guacamole/ as guacadmin (GUAC_ADMIN_PASSWORD in labs/.env)"
            ;;
        sandbox)
            # lab-sandbox.sh opens the shell itself right after this.
            [ "${CYBERLAB_CALLER:-}" = sandbox-shell ] || echo "  Open a shell in it: npm run lab:sandbox"
            ;;
    esac
    case "$lab" in
        dvwa) echo "  Inside Kali, DVWA is at http://dvwa/  (admin / password)" ;;
        juice-shop) echo "  Inside Kali, Juice Shop is at http://juice-shop:3000/" ;;
        webgoat) echo "  Inside Kali, WebGoat is at http://webgoat:8080/WebGoat/" ;;
        vulhub) echo "  Inside Kali, the Vulhub target is at http://vulhub/ (provisional: CVE-2021-41773)" ;;
        rede-de-alvos)
            echo "  Inside Kali: http://dvwa/ (admin / password) and http://juice-shop:3000/" ;;
    esac
}

# ---------- Commands ----------

cmd_up() {
    [ "${LAB_KIND[$lab]}" = desktop ] && ensure_env
    refuse_if_other_lab "$lab"
    local missing
    missing="$(missing_images "$lab")"
    if [ -n "$missing" ]; then
        echo "Missing images for lab '$lab':" >&2
        echo "$missing" | sed 's/^/  /' >&2
        echo "Download them from a terminal (uses the internet): scripts/lab.sh pull $lab" >&2
        exit 3
    fi
    echo "==> Starting lab '$lab'"
    # --pull never / --no-build: starting a lab never touches the internet.
    lab_compose_of "$lab" up -d --wait --wait-timeout 300 --pull never --no-build --remove-orphans
    if [ "${LAB_KIND[$lab]}" = desktop ]; then
        ensure_platform_user
    fi
    case "$lab" in
        dvwa | rede-de-alvos) init_dvwa_db ;;
    esac
    summary
}

cmd_down() {
    echo "==> Stopping lab '$lab'"
    lab_compose_of "$lab" down --remove-orphans "$@"
    local project="${LAB_PROJECT_OF[$lab]}" left nets
    left="$(docker ps -aq --filter "label=com.docker.compose.project=$project")"
    nets="$(docker network ls -q --filter "label=com.docker.compose.project=$project")"
    if [ -n "$left$nets" ]; then
        echo "Warning: containers or networks of project '$project' are still present" >&2
        exit 1
    fi
    echo "Lab '$lab' is down: no containers, no networks left."
}

cmd_switch() {
    local foreign running other
    foreign="$(lab_foreign_running)"
    if [ -n "$foreign" ]; then
        echo "Containers that belong to no lab are running; stop them by hand:" >&2
        echo "$foreign" | sed 's/^/  /' >&2
        exit 5
    fi
    running="$(lab_running_labs)"
    for other in $running; do
        if [ "$other" != "$lab" ]; then
            local target="$lab"
            lab="$other"
            cmd_down
            lab="$target"
        fi
    done
    cmd_up
}

cmd_reset() {
    refuse_if_other_lab "$lab"
    local services=(${LAB_RESET_SERVICES[$lab]}) volume
    echo "==> Resetting lab '$lab': recreating ${services[*]}"
    lab_compose_of "$lab" rm --stop --force "${services[@]}"
    for volume in ${LAB_RESET_VOLUMES[$lab]}; do
        echo "==> Deleting volume ${LAB_PROJECT_OF[$lab]}_$volume"
        docker volume rm -f "${LAB_PROJECT_OF[$lab]}_$volume" >/dev/null
    done
    cmd_up
}

cmd_verify() {
    if [ "$(lab_running_labs)" != "$lab" ]; then
        echo "Lab '$lab' is not the running lab. Start it first: scripts/lab.sh up $lab" >&2
        exit 2
    fi
    case "${LAB_KIND[$lab]}" in
        desktop) LAB_ACTIVE="$lab" "$LAB_ROOT/scripts/lab-verify-isolation.sh" ;;
        sandbox) "$LAB_ROOT/scripts/lab-sandbox.sh" verify ;;
    esac
}

cmd_pull() {
    echo "==> Pulling images for lab '$lab' (internet)"
    lab_compose_of "$lab" pull --ignore-buildable
    echo "==> Building local images for lab '$lab' (internet only if the cache is cold)"
    lab_compose_of "$lab" build
}

cmd_rebuild() {
    echo "==> Rebuilding local images for lab '$lab' with fresh packages (internet)"
    lab_compose_of "$lab" build --pull
}

# ---------- /home/kali and labs/.env backups (Phase 8, decision D3) ----------

KALI_HOME_VOLUME="${LAB_PROJECT}_kali_home"
KALI_IMAGE="cyberlab/kali-xfce:local"
KEEP_HOME_BACKUPS=3

# The Kali files must not change while they are copied: no desktop lab runs.
refuse_if_desktop_running() {
    local running
    for running in $(lab_running_labs); do
        if [ "${LAB_KIND[$running]}" = desktop ]; then
            echo "Lab '$running' is running (it uses /home/kali). Stop it first: scripts/lab.sh down $running" >&2
            exit 5
        fi
    done
}

rotate_home_backups() {  # keeps the newest KEEP_HOME_BACKUPS lab-* folders
    local dir="$1" old
    [ -d "$dir" ] || return 0
    for old in $(ls -1d "$dir"/lab-[0-9]*-[0-9]* 2>/dev/null | sort -r | tail -n +$((KEEP_HOME_BACKUPS + 1))); do
        rm -rf -- "$old"
    done
}

cmd_backup_home() {
    refuse_if_desktop_running
    docker volume inspect "$KALI_HOME_VOLUME" >/dev/null 2>&1 \
        || { echo "No /home/kali volume yet: start a desktop lab once." >&2; exit 1; }
    docker image inspect "$KALI_IMAGE" >/dev/null 2>&1 \
        || { echo "Missing $KALI_IMAGE: scripts/lab.sh pull kali" >&2; exit 3; }
    local stamp dir
    stamp="$(date +%Y%m%d-%H%M%S)"
    dir="$LAB_ROOT/data/backups/lab-$stamp"
    umask 077
    mkdir -p "$dir"
    echo "==> Saving /home/kali (without .cache and Burp's bundled browser, both rebuilt on their own)"
    # Disposable container: no network, read-only root, the volume read-only,
    # and only the capability to read files of any owner.
    docker run --rm --pull never --network none --read-only \
        --cap-drop ALL --cap-add DAC_READ_SEARCH --security-opt no-new-privileges:true \
        --user 0:0 --entrypoint tar -v "$KALI_HOME_VOLUME":/home/kali:ro "$KALI_IMAGE" \
        -C /home/kali --exclude=./.cache --exclude=./.BurpSuite/burpbrowser --numeric-owner -czf - . \
        > "$dir/kali-home.tar.gz"
    tar -tzf "$dir/kali-home.tar.gz" >/dev/null || { echo "The archive is unreadable" >&2; rm -rf "$dir"; exit 1; }
    if [ -f "$LAB_ENV" ]; then
        cp "$LAB_ENV" "$dir/labs.env"
        chmod 600 "$dir/labs.env"
    fi
    (cd "$dir" && sha256sum -- * > SHA256SUMS)
    rotate_home_backups "$LAB_ROOT/data/backups"
    echo "Saved: data/backups/lab-$stamp/ ($(du -sh "$dir" | cut -f1); $(tar -tzf "$dir/kali-home.tar.gz" | wc -l) entries)"
    local win
    win="$(windows_backup_dir)"
    if [ -z "$win" ]; then
        echo "Warning: Windows is not reachable: the backup stays only in data/backups/" >&2
        return
    fi
    mkdir -p "$win"
    cp -r "$dir" "$win/"
    rotate_home_backups "$win"
    echo "Copied to Windows: $win/lab-$stamp/"
}

cmd_restore_home() {
    local source="${lab:-}" with_env=false yes=false arg
    for arg in "${@}"; do
        case "$arg" in --yes) yes=true ;; --with-env) with_env=true ;; esac
    done
    [ -n "$source" ] && [ -d "$source" ] || source="$LAB_ROOT/data/backups/${lab:-}"
    if [ -z "${lab:-}" ] || [ ! -f "$source/kali-home.tar.gz" ]; then
        echo "Usage: scripts/lab.sh restore-home <backup dir (e.g. lab-20261001-213000)> --yes [--with-env]" >&2
        exit 2
    fi
    if ! $yes; then
        echo "This REPLACES everything in /home/kali with $source." >&2
        echo "To confirm, add --yes (and --with-env to also restore labs/.env)." >&2
        exit 2
    fi
    refuse_if_desktop_running
    (cd "$source" && sha256sum --quiet -c SHA256SUMS) || { echo "Checksums do not match: refusing" >&2; exit 1; }
    docker volume inspect "$KALI_HOME_VOLUME" >/dev/null 2>&1 \
        || { echo "No /home/kali volume yet: run scripts/lab.sh up kali and down once, then retry." >&2; exit 1; }
    echo "==> Replacing /home/kali with $source/kali-home.tar.gz"
    docker run --rm -i --pull never --network none --read-only --security-opt no-new-privileges:true \
        --user 0:0 --entrypoint sh -v "$KALI_HOME_VOLUME":/home/kali "$KALI_IMAGE" \
        -c 'find /home/kali -mindepth 1 -delete && tar -xzpf - --numeric-owner -C /home/kali' \
        < "$source/kali-home.tar.gz"
    echo "/home/kali restored."
    if $with_env && [ -f "$source/labs.env" ]; then
        if [ -f "$LAB_ENV" ] && ! cmp -s "$source/labs.env" "$LAB_ENV"; then
            cp "$LAB_ENV" "$LAB_ENV.before-restore-$(date +%Y%m%d-%H%M%S)"
            echo "Previous labs/.env kept as labs/.env.before-restore-*"
            if docker volume inspect "${LAB_PROJECT}_guac_db_data" >/dev/null 2>&1; then
                echo "Note: the Guacamole database was created with the old passwords. If the Kali" >&2
                echo "login fails, recreate it (Kali's files stay): docker volume rm ${LAB_PROJECT}_guac_db_data" >&2
            fi
        fi
        install -m 600 "$source/labs.env" "$LAB_ENV"
        echo "labs/.env restored."
    fi
}

case "$command" in
    backup-home) cmd_backup_home; exit 0 ;;
    restore-home) shift 2 2>/dev/null || shift; cmd_restore_home "$@"; exit 0 ;;
esac

case "$command" in
    up) cmd_up ;;
    down) cmd_down ;;
    switch) cmd_switch ;;
    reset) cmd_reset ;;
    verify) cmd_verify ;;
    pull) cmd_pull ;;
    rebuild) cmd_rebuild ;;
    purge) cmd_down --volumes ;;
esac
