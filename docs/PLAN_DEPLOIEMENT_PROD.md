# 🚀 Guide & Plan de Déploiement en Production - Mikroot SaaS

Ce document fournit la procédure complète étape par étape pour déployer la plateforme **Mikroot SaaS** en production sur un serveur VPS Ubuntu (22.04 ou 24.04 LTS) et effectuer des tests réels de connexion avec des routeurs MikroTik distants.

---

## 1. Vue d'Ensemble de l'Architecture en Production

```mermaid
flowchart TD
    subgraph Internet["🌐 Accès Utilisateurs & Routeurs"]
        UserBrowser["Navigateur Technicien / Client"]
        RemoteMikrotik["Routeur MikroTik Distant (4G / Starlink / Fibre)"]
    end

    subgraph VPS["🖥️ Serveur VPS Ubuntu (IP Publique Fixe)"]
        subgraph Ingress["Nginx Reverse Proxy + SSL Let's Encrypt"]
            Nginx["Nginx (*.mikroot.net, app.mikroot.net, api.mikroot.net)"]
        end

        subgraph Applications["Services Applicatifs"]
            Frontend["Frontend SaaS Next.js (Port 3000)"]
            Backend["Backend Django Gunicorn (Port 8000)"]
            MikhmonEngine["Moteur Mikroot Hotspot (Port 8080)"]
            PostgreSQL["Base de données PostgreSQL"]
        end

        subgraph NetworkLayer["Couche Réseau & Tunnel VPN"]
            WireGuard["Serveur WireGuard wg0 (UDP 51820 / IP: 10.8.0.1)"]
            IPTables["IPTables Port Forwarding (41xxx -> API / 51xxx -> Winbox)"]
            VpnAgent["Mikroot VPN Sync Agent (Daemon)"]
        end
    end

    UserBrowser -- "HTTPS mikroot.net" --> Nginx
    UserBrowser -- "HTTPS <espace>.mikroot.net" --> Nginx
    Nginx --> Frontend
    Nginx --> Backend
    Nginx --> MikhmonEngine

    RemoteMikrotik -- "Tunnel Chiffré WireGuard (UDP 51820)" --> WireGuard
    WireGuard --> IPTables
    MikhmonEngine -- "Connexion localhost:41xxx" --> IPTables
    IPTables -- "10.8.0.x:8728" --> RemoteMikrotik
    Backend -- "Provisionne Peers" --> VpnAgent
    VpnAgent -- "wg set wg0 peer" --> WireGuard
```

---

## 2. Prérequis pour le Déploiement

### 2.1 Spécifications Serveur VPS Recommandées
* **OS** : Ubuntu 22.04 LTS ou Ubuntu 24.04 LTS.
* **CPU** : 2 vCPU minimum.
* **RAM** : 4 Go de RAM (2 Go minimum avec 2 Go de Swap).
* **Stockage** : 40 Go SSD / NVMe.
* **Réseau** : 1 Adresse IPv4 Publique Fixe dédiée (ports non bloqués par le fournisseur).
* **Fournisseurs recommandés** : Hetzner, OVHcloud, DigitalOcean, Contabo ou Linode.

### 2.2 Configuration des Enregistrements DNS (ex: Cloudflare ou Registrar)
Pointe les enregistrements DNS vers l'adresse IPv4 publique de ton VPS (`VOTRE_IP_VPS`) :

| Type | Nom d'Hôte | Valeur / Cible | Description |
| :--- | :--- | :--- | :--- |
| **A** | `mikroot.net` | `VOTRE_IP_VPS` | Domaine principal / Vitrine |
| **A** | `app.mikroot.net` | `VOTRE_IP_VPS` | Portail SaaS Technicien / Client |
| **A** | `api.mikroot.net` | `VOTRE_IP_VPS` | API Backend Django |
| **A** | `vpn.mikroot.net` | `VOTRE_IP_VPS` | Serveur VPN WireGuard / L2TP |
| **A** | `*.mikroot.net` | `VOTRE_IP_VPS` | **Wildcard** (espaces clients : `siramanass.mikroot.net`, etc.) |

---

## 3. Procédure de Déploiement Étape par Étape

### ÉTAPE 1 : Préparation du Serveur VPS & Pare-feu

Connecte-toi en SSH à ton VPS :
```bash
ssh root@VOTRE_IP_VPS
```

Mets à jour le système et configure le pare-feu UFW :
```bash
apt update && apt upgrade -y
apt install -y git curl ufw fail2ban certbot python3-certbot-nginx

# Autoriser les ports essentiels
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 51820/udp       # Port WireGuard VPN
ufw allow 1701,500,4500/udp # Ports L2TP/IPsec
ufw allow 41000:42000/tcp # Plage Ports API MikroTik
ufw allow 51000:52000/tcp # Plage Ports Winbox Distants
ufw --force enable
```

---

### ÉTAPE 2 : Déploiement et Activation du Serveur VPN

1. Clone le dépôt du projet sur le serveur :
   ```bash
   cd /opt
   git clone https://github.com/VOTRE_COMPTE/mikroot-v2.git mikroot
   cd /opt/mikroot
   ```

2. Exécute le script d'installation automatisé du VPN :
   ```bash
   chmod +x infra/vpn/setup-vpn-server.sh
   ./infra/vpn/setup-vpn-server.sh
   ```
   > ⚠️ **Note bien la clé publique WireGuard** affichée à la fin (ex: `pUBL1cK3yM1kr00tS3rv3rVpnW1r3gu4rdD3m02026=`).

3. Active le service de synchronisation automatique en continu :
   ```bash
   cat <<EOF > /etc/systemd/system/mikroot-vpn-agent.service
   [Unit]
   Description=Mikroot VPN Auto-Sync Daemon
   After=network.target wireguard.service

   [Service]
   Type=simple
   Environment=MIKROOT_API_URL=http://127.0.0.1:8000/api/routers/vpn-sync/
   Environment=MIKROOT_SYNC_SECRET=cle-secrete-vpn-synchro-prod-2026
   ExecStart=/usr/bin/python3 /opt/mikroot/infra/vpn/mikroot-vpn-agent.py
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   EOF

   systemctl daemon-reload
   systemctl enable --now mikroot-vpn-agent
   ```

---

### ÉTAPE 3 : Déploiement du Backend Django & Base de Données

1. Installe PostgreSQL et crée la base de données :
   ```bash
   apt install -y postgresql postgresql-contrib python3-pip python3-venv
   sudo -u postgres psql -c "CREATE DATABASE mikroot_db;"
   sudo -u postgres psql -c "CREATE USER mikroot_user WITH PASSWORD 'MotDePasseTresSecurise2026!';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mikroot_db TO mikroot_user;"
   sudo -u postgres psql -c "ALTER USER mikroot_user CREATEDB;"
   ```

2. Configure l'environnement virtuel Python :
   ```bash
   cd /opt/mikroot/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r <(python3 -c "import tomllib; f=open('pyproject.toml','rb'); d=tomllib.load(f); print('\n'.join(d['project']['dependencies']))")
   pip install gunicorn psycopg2-binary
   ```

3. Crée le fichier `/opt/mikroot/backend/.env` :
   ```ini
   DEBUG=False
   SECRET_KEY=cle-django-ultra-securisee-prod-mikroot-2026
   ALLOWED_HOSTS=api.mikroot.net,app.mikroot.net,mikroot.net,127.0.0.1,localhost
   CORS_ALLOWED_ORIGINS=https://app.mikroot.net,https://mikroot.net
   DATABASE_URL=postgres://mikroot_user:MotDePasseTresSecurise2026!@127.0.0.1:5432/mikroot_db

   VPN_SERVER_HOST=vpn.mikroot.net
   VPN_WG_SERVER_PUBKEY=VOTRE_CLE_PUBLIQUE_GENEREE_A_L_ETAPE_2
   VPN_WG_SERVER_PORT=51820
   VPN_SYNC_SECRET=cle-secrete-vpn-synchro-prod-2026
   ```

4. Exécute les migrations et initialise les données de démonstration / administrateur :
   ```bash
   python manage.py migrate
   python manage.py collectstatic --noinput
   python manage.py createsuperuser
   ```

5. Configure le service Gunicorn sous Systemd :
   ```bash
   cat <<EOF > /etc/systemd/system/mikroot-backend.service
   [Unit]
   Description=Mikroot Django Backend Gunicorn
   After=network.target

   [Service]
   User=root
   WorkingDirectory=/opt/mikroot/backend
   ExecStart=/opt/mikroot/backend/venv/bin/gunicorn core.wsgi:application --workers 3 --bind 127.0.0.1:8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   EOF

   systemctl daemon-reload
   systemctl enable --now mikroot-backend
   ```

---

### ÉTAPE 4 : Déploiement du Frontend SaaS & Moteur Mikroot Hotspot

1. Installe Node.js 20+ et PM2 :
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   npm install -g pm2
   ```

2. Build et lancement du Frontend SaaS :
   ```bash
   cd /opt/mikroot/frontend
   cat <<EOF > .env.local
   NEXT_PUBLIC_API_URL=https://api.mikroot.net
   NEXT_PUBLIC_APP_URL=https://app.mikroot.net
   EOF
   npm install
   npm run build
   pm2 start npm --name "mikroot-frontend" -- start -- -p 3000
   ```

3. Build et lancement du Moteur Mikroot Hotspot :
   ```bash
   cd /opt/mikroot/mikhmon-engine
   npm install
   npx prisma generate
   npm run build
   pm2 start npm --name "mikroot-hotspot-engine" -- start -- -p 8080
   ```

4. Sauvegarde des processus PM2 au démarrage :
   ```bash
   pm2 save
   pm2 startup
   ```

---

### ÉTAPE 5 : Configuration du Reverse Proxy Nginx & Certificats SSL Wildcard

1. Génère le certificat SSL Wildcard Let's Encrypt pour `mikroot.net` et `*.mikroot.net` :
   ```bash
   certbot certonly --manual --preferred-challenges=dns -d "mikroot.net" -d "*.mikroot.net" -d "app.mikroot.net" -d "api.mikroot.net"
   ```
   *(Ajoute l'enregistrement DNS `_acme-challenge` demandé sur votre registrar).*

2. Crée la configuration Nginx `/etc/nginx/sites-available/mikroot.conf` :
   ```nginx
   # 1. API Backend Django (api.mikroot.net)
   server {
       listen 80;
       listen 443 ssl http2;
       server_name api.mikroot.net;

       ssl_certificate /etc/letsencrypt/live/mikroot.net/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/mikroot.net/privkey.pem;

       location /static/ {
           alias /opt/mikroot/backend/staticfiles/;
       }

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }

   # 2. Frontend SaaS Portail (app.mikroot.net & mikroot.net)
   server {
       listen 80;
       listen 443 ssl http2;
       server_name app.mikroot.net mikroot.net;

       ssl_certificate /etc/letsencrypt/live/mikroot.net/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/mikroot.net/privkey.pem;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }

   # 3. Moteur Mikroot Hotspot Wildcard (*.mikroot.net)
   server {
       listen 80;
       listen 443 ssl http2;
       server_name ~^(?<subdomain>.+)\.mikroot\.net$;

       ssl_certificate /etc/letsencrypt/live/mikroot.net/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/mikroot.net/privkey.pem;

       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Tenant-Space $subdomain;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. Active la configuration et redémarre Nginx :
   ```bash
   ln -s /etc/nginx/sites-available/mikroot.conf /etc/nginx/sites-enabled/
   nginx -t && systemctl restart nginx
   ```

---

## 4. Procédure de Test Réel sur un MikroTik Distant

Voici le protocole officiel pour tester la connexion avec un boîtier MikroTik physique (ex: MikroTik hEX, hAP lite, RB3011, RB4011, etc.) :

### Étape 1 : Créer son Compte et son Espace sur le SaaS
1. Va sur `https://app.mikroot.net/register` et crée un compte.
2. Connecte-toi sur le Dashboard (`https://app.mikroot.net/dashboard`).
3. Crée un nouvel Espace Mikhmon (ex: **`test-hotel`** en choisissant **RouterOS v7** ou **RouterOS v6**).

### Étape 2 : Ajouter le Routeur et Récupérer le Script
1. Clique sur **"Ajouter un Routeur"**.
2. Renseigne le nom (ex: `routeur-principal`) et valide.
3. Clique sur **"Ouvrir Mikhmon"** puis sélectionne l'onglet **"Paramètres & Sessions Routeurs"**.
4. Copie le **Script de Connexion Tunnel** généré en 1 clic.

### Étape 3 : Injecter le Script dans le MikroTik Distant
1. Ouvre le logiciel **Winbox** sur ton PC connecté au MikroTik en local (ou via l'interface WebFig).
2. Ouvre le **Terminal** (`New Terminal`).
3. **Colle le script** copié et appuie sur `Entrée`.

### Étape 4 : Vérification de la Connectivité
1. **Sur le MikroTik** :
   * Si RouterOS 7 : Va dans `WireGuard` $\rightarrow$ Vérifie que l'interface `wg-mikroot` est active et que des paquets sont transmis (`Tx/Rx`).
   * Fais un ping vers le serveur VPN : `/ping 10.8.0.1` (doit répondre en ~20-50ms).
2. **Sur le Moteur Mikroot Hotspot** :
   * Ouvre ton lien dédié : `https://test-hotel.mikroot.net`.
   * Connecte-toi avec `admin` / `mikroot2026`.
   * Clique sur **"Ouvrir"** en face de `routeur-principal` :
     $\rightarrow$ Le Dashboard Hotspot s'ouvre instantanément !
   * Teste la génération de 10 tickets Hotspot et l'impression rapide $\rightarrow$ Les tickets sont créés en direct dans le MikroTik distant !
3. **Accès Winbox Distant** :
   * Ouvre Winbox sur n'importe quel ordinateur connecté à Internet (sans être sur le site du client).
   * Renseigne l'adresse : `vpn.mikroot.net:51004`.
   * Tu as un accès direct et complet à ton MikroTik distant à travers les pare-feux et NAT 4G !
