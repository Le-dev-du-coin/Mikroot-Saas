import secrets
import uuid
from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.instances.models import MikhmonInstance


class Router(models.Model):
    """Routeur MikroTik géré via le SaaS."""

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Actif"
        EXPIRED = "EXPIRED", "Expiré"
        SUSPENDED = "SUSPENDED", "Suspendu"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="routers",
    )
    mikhmon_instance = models.ForeignKey(
        MikhmonInstance,
        on_delete=models.CASCADE,
        related_name="routers",
        verbose_name="Instance Mikhmon liée",
    )
    name = models.CharField("Nom du routeur", max_length=50)
    status = models.CharField(
        "Statut",
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    price_per_month = models.DecimalField(
        "Prix mensuel (FCFA)",
        max_digits=10,
        decimal_places=2,
        default=Decimal("500.00"),
    )
    auto_renew = models.BooleanField("Renouvellement automatique", default=True)
    expires_at = models.DateTimeField("Date d'expiration")
    last_ping = models.DateTimeField("Dernier Ping VPN", null=True, blank=True)
    created_at = models.DateTimeField("Créé le", auto_now_add=True)
    updated_at = models.DateTimeField("Mis à jour le", auto_now=True)

    class Meta:
        verbose_name = "Routeur MikroTik"
        verbose_name_plural = "Routeurs MikroTik"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

    @property
    def days_left(self) -> int:
        if not self.expires_at:
            return 0
        diff = self.expires_at - timezone.now()
        seconds = diff.total_seconds()
        if seconds <= 0:
            return 0
        # Arrondi supérieur pour refléter les jours entiers restants
        return int((seconds + 86399) // 86400)

    def is_valid(self) -> bool:
        return self.status == self.Status.ACTIVE and self.expires_at > timezone.now()


class VpnCredential(models.Model):
    """Identifiants VPN et ports de routage alloués."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    router = models.OneToOneField(
        Router,
        on_delete=models.CASCADE,
        related_name="vpn_credential",
    )
    vpn_server = models.CharField(
        "Serveur VPN",
        max_length=100,
        default=getattr(settings, "VPN_SERVER_HOST", "vpn.mondomaine.com"),
    )
    vpn_user = models.CharField("Utilisateur VPN", max_length=64, unique=True)
    vpn_password = models.CharField("Mot de passe VPN", max_length=64)
    assigned_ip = models.GenericIPAddressField("IP VPN Assignée (10.8.0.x)", protocol="IPv4")
    api_port = models.PositiveIntegerField("Port API Distant", unique=True)
    winbox_port = models.PositiveIntegerField("Port Winbox Distant", unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Identifiant VPN"
        verbose_name_plural = "Identifiants VPN"

    def __str__(self):
        return f"VPN for {self.router.name} (API: {self.api_port} / Winbox: {self.winbox_port})"

    @classmethod
    def allocate_next_credentials(cls, router: Router) -> "VpnCredential":
        """Alloue automatiquement le prochain port et l'IP disponible."""
        last_vpn = cls.objects.order_by("-api_port").first()

        start_api = getattr(settings, "VPN_API_PORT_START", 41000)
        start_winbox = getattr(settings, "VPN_WINBOX_PORT_START", 51000)

        if last_vpn:
            next_api = last_vpn.api_port + 1
            next_winbox = last_vpn.winbox_port + 1
            ip_num = (last_vpn.api_port - start_api) + 2
        else:
            next_api = start_api + 1
            next_winbox = start_winbox + 1
            ip_num = 2

        assigned_ip = f"10.8.0.{ip_num}"
        vpn_user = f"{router.name.lower()}_{router.id.hex[:6]}"
        vpn_password = secrets.token_hex(16)

        return cls.objects.create(
            router=router,
            vpn_user=vpn_user,
            vpn_password=vpn_password,
            assigned_ip=assigned_ip,
            api_port=next_api,
            winbox_port=next_winbox,
        )

    def generate_mikrotik_script(self) -> str:
        """Génère les lignes de commandes RouterOS prêtes à être copiées dans le terminal."""
        vpn_interface = f"{self.router.name}-VPN"
        script = (
            f"/interface l2tp-client add connect-to={self.vpn_server} "
            f"name={vpn_interface} user={self.vpn_user} password={self.vpn_password} "
            f"disabled=no add-default-route=no use-ipsec=no\n"
            f'/ip firewall filter add action=accept chain=input in-interface={vpn_interface} '
            f'comment="Autoriser le trafic de {vpn_interface}" place-before=0'
        )
        return script
