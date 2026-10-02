# Shared helpers and the lab registry for the lab scripts. Source it; do not run it.

LAB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAB_DIR="$LAB_ROOT/labs"
LAB_ENV="$LAB_DIR/.env"
LAB_LOCK="$LAB_ROOT/data/lab.lock"
# Compose project of every desktop lab (Guacamole + Kali + target).
LAB_PROJECT="cyberlab"

# ---------- Registry ----------
# The closed list of labs that scripts/lab.sh (and so the platform) can run.
# lib/labs/catalog.ts must agree: `npm test` compares it with `lab.sh list`.
# Files are relative to labs/; the first one's directory is the Compose
# project directory.
# Order matters: it must match the order of the available labs in
# lib/labs/catalog.ts (the deepEqual in lib/labs/catalog.test.ts).
LAB_SLUGS=(kali dvwa linux-sandbox juice-shop rede-de-alvos webgoat vulhub)
declare -A LAB_KIND=(
    [kali]=desktop [dvwa]=desktop [linux-sandbox]=sandbox
    [juice-shop]=desktop [rede-de-alvos]=desktop [webgoat]=desktop [vulhub]=desktop
)
declare -A LAB_PROJECT_OF=(
    [kali]=cyberlab [dvwa]=cyberlab [linux-sandbox]=cyberlab-sandbox
    [juice-shop]=cyberlab [rede-de-alvos]=cyberlab [webgoat]=cyberlab [vulhub]=cyberlab
)
declare -A LAB_FILES=(
    [kali]="base/compose.yaml"
    [dvwa]="base/compose.yaml dvwa/compose.yaml"
    [linux-sandbox]="linux-sandbox/compose.yaml"
    [juice-shop]="base/compose.yaml juice-shop/compose.yaml"
    [rede-de-alvos]="base/compose.yaml dvwa/compose.yaml juice-shop/compose.yaml"
    [webgoat]="base/compose.yaml webgoat/compose.yaml"
    [vulhub]="base/compose.yaml vulhub/compose.yaml"
)
# What "reset" throws away: these services are recreated and these named
# volumes (without the project prefix) are deleted. kali_home is never here.
declare -A LAB_RESET_SERVICES=(
    [kali]="kali" [dvwa]="dvwa dvwa-db" [linux-sandbox]="sandbox"
    [juice-shop]="juice-shop" [rede-de-alvos]="dvwa dvwa-db juice-shop"
    [webgoat]="webgoat" [vulhub]="vulhub"
)
declare -A LAB_RESET_VOLUMES=(
    [kali]="" [dvwa]="dvwa_db_data" [linux-sandbox]=""
    [juice-shop]="" [rede-de-alvos]="dvwa_db_data" [webgoat]="" [vulhub]=""
)

lab_is_known() {
    [ -n "${1:-}" ] && [ -n "${LAB_KIND[$1]+x}" ]
}

# lab_compose_of <lab> <compose args...>
lab_compose_of() {
    local lab="$1" f
    shift
    local files=(${LAB_FILES[$lab]})
    local args=(-p "${LAB_PROJECT_OF[$lab]}" --project-directory "$LAB_DIR/$(dirname "${files[0]}")")
    # Only desktop labs read secrets; the sandbox needs no labs/.env.
    [ "${LAB_KIND[$lab]}" = desktop ] && args+=(--env-file "$LAB_ENV")
    for f in "${files[@]}"; do args+=(-f "$LAB_DIR/$f"); done
    docker compose "${args[@]}" "$@"
}

# The label Compose puts on every container: the -f files, comma-joined.
lab_config_label() {
    local f out=""
    for f in ${LAB_FILES[$1]}; do out+="${out:+,}$LAB_DIR/$f"; done
    echo "$out"
}

# lab_of <project> <config_files label>: the lab slug, or "-" if unknown.
lab_of() {
    local lab
    for lab in "${LAB_SLUGS[@]}"; do
        if [ "$1" = "${LAB_PROJECT_OF[$lab]}" ] && [ "$2" = "$(lab_config_label "$lab")" ]; then
            echo "$lab"
            return
        fi
    done
    echo "-"
}

# Every Compose container (any project), one per line, tab-separated:
# name, project, service, state, health ("-" if none), lab ("-" if unknown).
lab_containers() {
    local ids
    ids="$(docker ps -aq --filter label=com.docker.compose.project)"
    [ -z "$ids" ] && return 0
    # shellcheck disable=SC2086
    docker inspect -f '{{.Name}}	{{index .Config.Labels "com.docker.compose.project"}}	{{index .Config.Labels "com.docker.compose.service"}}	{{.State.Status}}	{{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}}	{{index .Config.Labels "com.docker.compose.project.config_files"}}' $ids \
        | while IFS=$'\t' read -r name project service state health files; do
              printf '%s\t%s\t%s\t%s\t%s\t%s\n' "${name#/}" "$project" "$service" "$state" "$health" \
                  "$(lab_of "$project" "$files")"
          done
}

# Labs with at least one running container, one per line.
lab_running_labs() {
    lab_containers | awk -F'\t' '$4 == "running" && $6 != "-" { print $6 }' | sort -u
}

# Running Compose containers that belong to no known lab (another project, or
# an old file combination), one name per line.
lab_foreign_running() {
    lab_containers | awk -F'\t' '$4 == "running" && $6 == "-" { print $1 }'
}

# The running desktop lab, if exactly one is running.
lab_active_desktop() {
    local lab found=""
    for lab in $(lab_running_labs); do
        [ "${LAB_KIND[$lab]}" = desktop ] && found+="$lab "
    done
    found="${found% }"
    [ -n "$found" ] && [ "${found// /}" = "$found" ] && echo "$found"
}

# Compose for the lab in $LAB_ACTIVE (set by the caller), used by the
# verification and measuring scripts.
lab_compose() {
    lab_compose_of "${LAB_ACTIVE:?LAB_ACTIVE is not set}" "$@"
}

# Images of <lab> that are not in the local Docker store, one per line.
missing_images() {
    local image
    lab_compose_of "$1" config --images | while read -r image; do
        docker image inspect "$image" >/dev/null 2>&1 || echo "$image"
    done
}

lab_env_value() {
    grep -E "^$1=" "$LAB_ENV" | head -n1 | cut -d= -f2-
}
