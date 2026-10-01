# Practice box for module 0.3 "Linux: primeiros passos no terminal".
#
# Not an attack target: it has no vulnerability and no network. It only holds
# the files of the module's missions (missions/build-missions.sh), so the
# learner can practise, and break things, outside their real system.
# Built with internet access (docker build); runs with network_mode: none.
FROM debian:trixie-slim@sha256:a99cfc517144bc59b1978475ec53b46ecabec7e43635402ee5b77cc54cd1b20a

ENV LANG=C.UTF-8

# The slim image strips man pages; the module teaches `man`, so keep them and
# reinstall the base packages whose pages were excluded.
RUN rm -f /etc/dpkg/dpkg.cfg.d/docker \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        man-db manpages less file procps nano bash-completion \
    && apt-get install -y --no-install-recommends --reinstall \
        bash coreutils findutils grep sed tar gzip diffutils util-linux mount \
        login passwd mawk hostname debianutils bsdutils \
    && rm -rf /var/lib/apt/lists/*

# Unprivileged learner account, without sudo (sudo is not even installed).
RUN useradd --create-home --shell /bin/bash --uid 1000 aluno

COPY missions/ /opt/missions/

USER aluno
WORKDIR /home/aluno
RUN bash /opt/missions/build-missions.sh \
    && cat /opt/missions/bashrc-extra >> /home/aluno/.bashrc

CMD ["sleep", "infinity"]
