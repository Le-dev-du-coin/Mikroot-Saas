from django.core.management.base import BaseCommand
from apps.accounts.models import User
from apps.billing.models import PlatformSetting, Wallet


class Command(BaseCommand):
    help = "Initialise la base de production propre avec le SuperAdmin et les tarifs officiels."

    def add_arguments(self, parser):
        parser.add_argument("--email", type=str, default="logic01pro@proton.me")
        parser.add_argument("--password", type=str, default="Mijo@2019")
        parser.add_argument("--balance", type=float, default=50000.0)

    def handle(self, *args, **options):
        email = options["email"]
        password = options["password"]
        balance = options["balance"]

        # 1. Tarifs officiels de la plateforme
        setting, _ = PlatformSetting.objects.get_or_create(id=1)
        setting.mikhmon_instance_monthly_price = 1000
        setting.router_monthly_price = 500
        setting.save()

        # 2. SuperAdmin
        user, created = User.objects.get_or_create(email=email)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()

        # 3. Wallet
        wallet, _ = Wallet.objects.get_or_create(user=user)
        wallet.balance = balance
        wallet.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"[OK] Base de production initialisée ! SuperAdmin: {email} (Solde: {balance} FCFA)"
            )
        )
