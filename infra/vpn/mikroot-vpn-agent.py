#!/usr/bin/env python3
"""
MIKROOT VPN SYNC AGENT
Synchronise automatiquement les peers WireGuard (RouterOS 7)
et les utilisateurs L2TP/IPsec (RouterOS 6) depuis l'API SaaS Mikroot.
"""

import json
import logging
import os
import subprocess
import time
import urllib.request

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("MikrootVpnAgent")

# Configuration via variables d'environnement
API_URL = os.getenv("MIKROOT_API_URL", "http://127.0.0.1:8000/api/routers/vpn-sync/")
SYNC_SECRET = os.getenv("MIKROOT_SYNC_SECRET", "mikroot-vpn-sync-secret-token-2026")
SYNC_INTERVAL = int(os.getenv("MIKROOT_SYNC_INTERVAL", "30"))  # secondes
WG_INTERFACE = os.getenv("MIKROOT_WG_IFACE", "wg0")


def fetch_active_peers():
    """Récupère la liste des routeurs actifs autorisés depuis le SaaS."""
    try:
        req = urllib.request.Request(API_URL)
        req.add_header("X-VPN-Secret", SYNC_SECRET)
        req.add_header("User-Agent", "Mikroot-VPN-Agent/1.0")

        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                return data.get("peers", [])
    except Exception as e:
        logger.error(f"Erreur de communication avec l'API Mikroot : {e}")
    return None


def sync_wireguard_peers(peers):
    """Synchronise les pairs WireGuard (RouterOS 7) dans l'interface wg0."""
    ros7_peers = [p for p in peers if p.get("wireguard_public_key")]

    logger.info(f"Synchronisation de {len(ros7_peers)} pair(s) WireGuard...")

    for p in ros7_peers:
        pubkey = p["wireguard_public_key"]
        ip = p["assigned_ip"]
        try:
            # wg set wg0 peer <KEY> allowed-ips <IP>/32
            cmd = [
                "wg",
                "set",
                WG_INTERFACE,
                "peer",
                pubkey,
                "allowed-ips",
                f"{ip}/32",
                "persistent-keepalive",
                "25",
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            logger.debug(f"[WireGuard] Pair {p['name']} ({ip}) synchronisé.")
        except Exception as e:
            logger.warning(f"Impossible d'ajouter le pair WG {p['name']} : {e}")


def sync_l2tp_users(peers):
    """Synchronise les identifiants L2TP (RouterOS 6) dans /etc/ppp/chap-secrets."""
    ros6_peers = [p for p in peers if p.get("l2tp_user") and p.get("l2tp_password")]
    chap_file = "/etc/ppp/chap-secrets"

    if not os.path.exists("/etc/ppp"):
        return

    logger.info(f"Synchronisation de {len(ros6_peers)} utilisateur(s) L2TP...")

    lines = ["# Mikroot L2TP Managed Users - DO NOT EDIT MANUALLY\n"]
    for p in ros6_peers:
        user = p["l2tp_user"]
        pwd = p["l2tp_password"]
        ip = p["assigned_ip"]
        lines.append(f'"{user}" * "{pwd}" {ip}\n')

    try:
        with open(chap_file, "w", encoding="utf-8") as f:
            f.writelines(lines)
    except Exception as e:
        logger.error(f"Erreur d'écriture sur {chap_file} : {e}")


def main_loop():
    logger.info("=== Démarrage du Mikroot VPN Sync Agent ===")
    logger.info(f"Cible API : {API_URL}")
    logger.info(f"Intervalle : {SYNC_INTERVAL}s")

    while True:
        peers = fetch_active_peers()
        if peers is not None:
            sync_wireguard_peers(peers)
            sync_l2tp_users(peers)
        time.sleep(SYNC_INTERVAL)


if __name__ == "__main__":
    main_loop()
