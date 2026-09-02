"""Service de provisionnement multi-tenant pour Mikhmon-Next Engine.

Synchronise chaque espace Mikhmon dans son propre fichier isolé :
mikhmon-engine/data/tenants/<nom_espace>.json
Garantit une isolation totale entre les 20+ espaces différents.
"""

import json
import logging
from pathlib import Path
from django.conf import settings

logger = logging.getLogger(__name__)


class MikhmonProvisioningService:
    """Gère l'injection hermétique des routeurs et identifiants par espace."""

    @classmethod
    def get_tenants_dir(cls) -> Path:
        """Retourne le répertoire mikhmon-engine/data/tenants/."""
        base_dir = Path(settings.BASE_DIR).parent
        tenants_dir = base_dir / "mikhmon-engine" / "data" / "tenants"
        tenants_dir.mkdir(parents=True, exist_ok=True)
        return tenants_dir

    @classmethod
    def get_instance_config_path(cls, instance_name: str) -> Path:
        """Retourne le chemin vers le fichier de l'espace spécifique."""
        clean_name = instance_name.strip().lower()
        return cls.get_tenants_dir() / f"{clean_name}.json"

    @classmethod
    def load_instance_config(cls, instance) -> dict:
        """Charge la configuration isolée de l'espace."""
        config_path = cls.get_instance_config_path(instance.name)
        if config_path.exists():
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Erreur de lecture sur {config_path}: {e}")

        return {
            "admin": {
                "username": instance.admin_user or "admin",
                "password": instance.admin_password or "mikroot2026",
            },
            "routers": [],
        }

    @classmethod
    def save_instance_config(cls, instance_name: str, config: dict) -> None:
        """Sauvegarde de façon atomique la configuration du tenant."""
        config_path = cls.get_instance_config_path(instance_name)
        temp_path = config_path.with_suffix(".tmp")
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            temp_path.replace(config_path)
            logger.info(f"[Multi-Tenant] Configuration de l'espace '{instance_name}' mise à jour dans {config_path}")
        except Exception as e:
            logger.error(f"Erreur d'écriture sur {config_path}: {e}")
            if temp_path.exists():
                temp_path.unlink()

    @classmethod
    def provision_router(cls, router) -> None:
        """Initialise ou met à jour les accès administrateur de l'espace sans pré-remplir les routeurs."""
        try:
            instance = router.mikhmon_instance
            config = cls.load_instance_config(instance)

            # Mise à jour des identifiants admin de l'espace
            admin_user = instance.admin_user or "admin"
            admin_pass = instance.admin_password or "mikroot2026"
            config["admin"] = {
                "username": admin_user,
                "password": admin_pass,
            }

            # On conserve les routeurs configurés manuellement par le client dans Mikhmon
            if "routers" not in config:
                config["routers"] = []

            cls.save_instance_config(instance.name, config)

        except Exception as e:
            logger.error(f"Erreur d'initialisation de l'espace pour {router.name}: {e}")

    @classmethod
    def deprovision_router(cls, router_id: str) -> None:
        """Supprime le routeur du fichier de son espace."""
        try:
            from apps.routers.models import Router
            try:
                router = Router.objects.select_related("mikhmon_instance").get(id=router_id)
                instance_name = router.mikhmon_instance.name
                config = cls.load_instance_config(router.mikhmon_instance)
                config["routers"] = [r for r in config.get("routers", []) if str(r.get("id")) != str(router_id)]
                cls.save_instance_config(instance_name, config)
            except Router.DoesNotExist:
                # Si déjà supprimé de la BDD, nettoyer dans tous les fichiers tenants
                for file_path in cls.get_tenants_dir().glob("*.json"):
                    with open(file_path, "r", encoding="utf-8") as f:
                        config = json.load(f)
                    filtered = [r for r in config.get("routers", []) if str(r.get("id")) != str(router_id)]
                    if len(filtered) != len(config.get("routers", [])):
                        config["routers"] = filtered
                        cls.save_instance_config(file_path.stem, config)
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du routeur {router_id}: {e}")

    @classmethod
    def sync_all(cls) -> int:
        """Synchronise l'ensemble des espaces et routeurs en fichiers isolés."""
        from apps.routers.models import Router
        from apps.instances.models import MikhmonInstance

        count = 0
        instances = MikhmonInstance.objects.filter(is_active=True)

        for instance in instances:
            admin_user = instance.admin_user or "admin"
            admin_pass = instance.admin_password or "mikroot2026"

            config = cls.load_instance_config(instance)
            config["admin"] = {
                "username": admin_user,
                "password": admin_pass,
            }
            if "routers" not in config:
                config["routers"] = []

            cls.save_instance_config(instance.name, config)
            count += 1

        return count
