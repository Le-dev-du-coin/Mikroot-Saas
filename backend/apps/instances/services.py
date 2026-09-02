"""Service de provisionnement automatique pour Mikhmon-Next Engine.

Synchronise instantanément les instances et routeurs créés dans le SaaS
avec le moteur d'exécution Mikhmon-Next (data/routers.json).
"""

import json
import logging
from pathlib import Path
from django.conf import settings

logger = logging.getLogger(__name__)


class MikhmonProvisioningService:
    """Gère l'injection et la mise à jour des routeurs et identifiants dans Mikhmon-Next."""

    @classmethod
    def get_config_path(cls) -> Path:
        """Retourne le chemin vers le fichier data/routers.json du moteur Mikhmon."""
        base_dir = Path(settings.BASE_DIR).parent  # mikroot-v2 root
        engine_data_dir = base_dir / "mikhmon-engine" / "data"
        engine_data_dir.mkdir(parents=True, exist_ok=True)
        return engine_data_dir / "routers.json"

    @classmethod
    def load_config(cls) -> dict:
        """Charge le fichier JSON existant ou retourne une configuration par défaut."""
        config_path = cls.get_config_path()
        if config_path.exists():
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Erreur lors de la lecture de {config_path}: {e}")

        return {
            "admin": {
                "username": "admin",
                "password": "mikroot2026",
            },
            "routers": [],
        }

    @classmethod
    def save_config(cls, config: dict) -> None:
        """Sauvegarde de façon sécurisée la configuration JSON."""
        config_path = cls.get_config_path()
        temp_path = config_path.with_suffix(".tmp")
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            temp_path.replace(config_path)
            logger.info(f"Configuration Mikhmon-Next mise à jour avec succès dans {config_path}")
        except Exception as e:
            logger.error(f"Erreur lors de l'écriture de {config_path}: {e}")
            if temp_path.exists():
                temp_path.unlink()

    @classmethod
    def provision_router(cls, router) -> None:
        """Provisionne ou met à jour un routeur dans la configuration de Mikhmon-Next."""
        try:
            config = cls.load_config()
            instance = router.mikhmon_instance
            vpn = getattr(router, "vpn_credential", None) or getattr(router, "vpn", None)

            if not vpn:
                return

            # 1. Mise à jour des identifiants admin globaux si définis
            admin_user = instance.admin_user or "admin"
            admin_pass = instance.admin_password or "mikroot2026"
            config["admin"] = {
                "username": admin_user,
                "password": admin_pass,
            }

            # 2. Préparation du payload de session pour le routeur
            router_entry = {
                "id": str(router.id),
                "name": router.name,
                "host": f"{instance.name}.mikroot.net",
                "port": vpn.api_port,
                "username": admin_user,
                "password": admin_pass,
                "hotspotName": f"Hotspot {router.name}",
                "dnsName": f"{instance.name}.mikroot.net",
                "currency": "FCFA",
                "autoReload": 10,
                "createdAt": router.created_at.isoformat(),
                "updatedAt": router.updated_at.isoformat(),
            }

            # 3. Remplacement ou ajout dans la liste
            routers_list = config.get("routers", [])
            index = next((i for i, r in enumerate(routers_list) if str(r.get("id")) == str(router.id) or r.get("name") == router.name), -1)

            if index >= 0:
                routers_list[index] = router_entry
            else:
                routers_list.append(router_entry)

            config["routers"] = routers_list
            cls.save_config(config)

        except Exception as e:
            logger.error(f"Erreur lors du provisionnement du routeur {router.name}: {e}")

    @classmethod
    def deprovision_router(cls, router_id: str) -> None:
        """Supprime un routeur de la configuration de Mikhmon-Next."""
        try:
            config = cls.load_config()
            routers_list = config.get("routers", [])
            config["routers"] = [r for r in routers_list if str(r.get("id")) != str(router_id)]
            cls.save_config(config)
        except Exception as e:
            logger.error(f"Erreur lors du dé-provisionnement du routeur ID {router_id}: {e}")

    @classmethod
    def sync_all(cls) -> int:
        """Synchronise l'ensemble des routeurs actifs en base avec Mikhmon-Next."""
        from apps.routers.models import Router
        count = 0
        routers = Router.objects.select_related("mikhmon_instance", "vpn_credential").filter(status=Router.Status.ACTIVE)
        for router in routers:
            cls.provision_router(router)
            count += 1
        return count
