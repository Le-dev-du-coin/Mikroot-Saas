# 🛡️ Déploiement du Serveur VPN Mikroot (WireGuard & L2TP)

Ce dossier contient l'outillage complet pour automatiser le serveur VPN hébergeant les tunnels de routeurs MikroTik distants.

---

## 🚀 Méthode 1 : Installation Native 1-Clic (Recommandée sur Ubuntu 22.04/24.04 VPS)

1. Connectez-vous en SSH à votre serveur VPS :
   ```bash
   ssh root@vpn.mikroot.net
   ```
2. Téléchargez ou copiez le dossier `infra/vpn/` sur le serveur.
3. Rendez le script exécutable et lancez l'installation :
   ```bash
   chmod +x setup-vpn-server.sh
   ./setup-vpn-server.sh
   ```
4. Le script :
   * Active le forwarding du noyau Linux (`net.ipv4.ip_forward = 1`).
   * Génère les clés de chiffrement WireGuard du serveur.
   * Configure les règles de redirection IPTables des plages API (`41000-42000`) et Winbox (`51000-52000`).
   * Affiche la **Clé Publique WireGuard** à renseigner dans le `.env` du SaaS Mikroot (`VPN_WG_SERVER_PUBKEY`).

---

## 🤖 Méthode 2 : Lancement de l'Agent de Synchronisation Dynamique

L'agent `mikroot-vpn-agent.py` inscrit automatiquement les nouveaux routeurs sans redémarrer le serveur VPN :

```bash
export MIKROOT_API_URL="https://api.mikroot.net/api/routers/vpn-sync/"
export MIKROOT_SYNC_SECRET="mikroot-vpn-sync-secret-token-2026"
python3 mikroot-vpn-agent.py
```

### Installation en tant que Service Systemd :
```bash
cat <<EOF > /etc/systemd/system/mikroot-vpn-agent.service
[Unit]
Description=Mikroot VPN Auto-Sync Daemon
After=network.target wireguard.service

[Service]
Type=simple
Environment=MIKROOT_API_URL=https://api.mikroot.net/api/routers/vpn-sync/
Environment=MIKROOT_SYNC_SECRET=mikroot-vpn-sync-secret-token-2026
ExecStart=/usr/bin/python3 /opt/mikroot/infra/vpn/mikroot-vpn-agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now mikroot-vpn-agent
```
