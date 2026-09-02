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
        """Injecte le routeur uniquement dans le fichier de son espace dédié."""
        try:
            instance = router.mikhmon_instance
            vpn = getattr(router, "vpn_credential", None) or getattr(router, "vpn", None)

            if not vpn:
                return

            config = cls.load_instance_config(instance)

            # Mise à jour des identifiants admin de l'espace
            admin_user = instance.admin_user or "admin"
            admin_pass = instance.admin_password or "mikroot2026"
            config["admin"] = {
                "username": admin_user,
                "password": admin_pass,
            }

            router_entry = {
                "id": str(router.id),
                "name": router.name,
                "host": vpn.assigned_ip if vpn.assigned_ip else f"{instance.name}.mikroot.app",
                "port": 8728 if vpn.assigned_ip else vpn.api_port,
                "username": admin_user,
                "password": admin_pass,
                "hotspotName": f"Hotspot {router.name}",
                "dnsName": f"{instance.name}.mikroot.app",
                "currency": "FCFA",
                "autoReload": 10,
                "createdAt": router.created_at.isoformat(),
                "updatedAt": router.updated_at.isoformat(),
            }

            routers_list = config.get("routers", [])
            index = next((i for i, r in enumerate(routers_list) if str(r.get("id")) == str(router.id) or r.get("name") == router.name), -1)

            if index >= 0:
                routers_list[index] = router_entry
            else:
                routers_list.append(router_entry)

            config["routers"] = routers_list
            cls.save_instance_config(instance.name, config)

        except Exception as e:
            logger.error(f"Erreur de provisionnement pour {router.name}: {e}")

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
            routers = Router.objects.select_related("vpn_credential").filter(
                mikhmon_instance=instance, status=Router.Status.ACTIVE
            )
            admin_user = instance.admin_user or "admin"
            admin_pass = instance.admin_password or "mikroot2026"

            routers_list = []
            for r in routers:
                vpn = getattr(r, "vpn_credential", None)
                if vpn:
                    routers_list.append({
                        "id": str(r.id),
                        "name": r.name,
                        "host": f"{instance.name}.mikroot.net",
                        "port": vpn.api_port,
                        "username": admin_user,
                        "password": admin_pass,
                        "hotspotName": f"Hotspot {r.name}",
                        "dnsName": f"{instance.name}.mikroot.net",
                        "currency": "FCFA",
                        "autoReload": 10,
                        "createdAt": r.created_at.isoformat(),
                        "updatedAt": r.updated_at.isoformat(),
                    })
                    count += 1

            config = {
                "admin": {
                    "username": admin_user,
                    "password": admin_pass,
                },
                "routers": routers_list,
            }
            cls.save_instance_config(instance.name, config)

        return count
