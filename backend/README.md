# Mikroot Backend Core API

Backend Python (Django + Poetry + Decouple) pour la plateforme SaaS Mikroot.

## Installation locale

1. Installer les dépendances :
```bash
poetry install
```

2. Configurer les variables d'environnement :
```bash
cp .env.example .env
```

3. Appliquer les migrations :
```bash
poetry run python manage.py migrate
```

4. Lancer le serveur de développement :
```bash
poetry run python manage.py runserver
```
