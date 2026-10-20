# Kali attack box with a lightweight XFCE desktop served over VNC.
# Packages are installed at build time (with internet); at runtime the
# container only sees internal networks, so updates mean a rebuild:
#   scripts/lab-up.sh --rebuild
FROM kalilinux/kali-rolling@sha256:d1d7e581ed60b0bbf9cb8a4bc853526355978f3b943d3a1d7dc7ce209e4231b6

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Crypto track (Track 3): openssl, xxd and python3-cryptography for symmetric
# crypto (3.3); hashcat and john for offline hash cracking (3.2).
# Networks & services track (Track 5): metasploit-framework for module 5.3
# (search/use/set/run against the vulhub target). It runs fully inside the
# internal lab network: `search` uses the local module cache, the exploit
# reaches the target, and the reverse payload connects back to this box's
# lab_net IP. No PostgreSQL here on purpose (msfconsole works dbless; keeps
# RAM down) — module 5.3 teaches that nuance.
# Password attacks (module 5.5): hydra for online brute force / password
# spraying against an authenticated service; wordlists (ships rockyou.txt.gz)
# for OFFLINE cracking of a hash pulled from the target. The module teaches the
# split on purpose — online runs use a short, targeted list (slow, noisy, rate
# limited), offline uses the full rockyou (fast, local).
# Wireshark: keep dumpcap non-setuid; capture with `sudo wireshark`.
RUN echo "wireshark-common wireshark-common/install-setuid boolean false" \
        | debconf-set-selections \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
        xfce4 xfce4-terminal xfce4-notifyd dbus-x11 \
        xfce4-whiskermenu-plugin xfce4-cpugraph-plugin xfce4-genmon-plugin \
        xfce4-power-manager-plugins \
        tigervnc-standalone-server tigervnc-tools \
        kali-themes kali-menu \
        fonts-dejavu-core \
        sudo procps iproute2 iputils-ping dnsutils net-tools less nano \
        firefox-esr burpsuite \
        nmap netcat-traditional curl sqlmap wireshark \
        openssl xxd python3-cryptography hashcat john \
        metasploit-framework \
        hydra wordlists \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Kali ships nmap with file capabilities that include cap_net_admin. Docker
# does not grant NET_ADMIN, so the kernel refuses to exec such binaries.
# Strip them instead of widening the container: `nmap` runs as a connect
# scan for the user, `sudo nmap` does SYN scans (root keeps NET_RAW).
# Kali's /usr/bin/nmap wrapper forces --privileged for non-root users because
# it relies on those capabilities, so replace it with a plain exec.
RUN getcap -r /usr 2>/dev/null | awk '{ print $1 }' | xargs -r setcap -r \
 && printf '#!/bin/sh\nexec /usr/lib/nmap/nmap "$@"\n' > /usr/bin/nmap

# Unprivileged desktop user; passwordless sudo inside the container only.
RUN useradd --create-home --shell /bin/bash --groups sudo kali \
 && echo "kali ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/kali \
 && chmod 0440 /etc/sudoers.d/kali \
 && mkdir -p /tmp/.X11-unix \
 && chmod 1777 /tmp/.X11-unix

# XFCE defaults: no compositor (saves CPU/RAM over VNC).
COPY --chown=kali:kali config/xfwm4.xml /home/kali/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 0755 /usr/local/bin/entrypoint.sh

# Module 3.2 (Track 3): read-only offline hash-cracking exercise. Only the
# hashes live here — never the plaintext passwords. The flag is a plaintext the
# reader recovers by cracking, so nothing secret ships in the image. The module
# copies this to ~/lab-3.2 to work on it.
COPY lab-3.2/ /opt/lab-3.2/
RUN chmod 0755 /opt/lab-3.2/conferir.sh \
 && chmod 0644 /opt/lab-3.2/webapp.hashes /opt/lab-3.2/shadow.leak /opt/lab-3.2/README.txt

USER kali
WORKDIR /home/kali
EXPOSE 5901
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
