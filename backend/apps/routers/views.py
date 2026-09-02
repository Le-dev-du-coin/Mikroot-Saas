from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.billing.models import PlatformSetting, Transaction, Wallet
from apps.instances.models import MikhmonInstance
from .models import Router, VpnCredential
from .serializers import CreateRouterSerializer, RouterSerializer


class RouterListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        routers = Router.objects.filter(user=request.user).select_related("mikhmon_instance", "vpn_credential")
        return Response(RouterSerializer(routers, many=True).data)


class CreateRouterView(APIView):
    """Création d'un routeur avec validation stricte en backend (unicité, solde, allocation VPN)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateRouterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        instance_id = serializer.validated_data["mikhmon_instance_id"]
        router_name = serializer.validated_data["name"].strip()
        auto_renew = serializer.validated_data.get("auto_renew", True)

        try:
            mikhmon_instance = MikhmonInstance.objects.get(id=instance_id, user=request.user)
        except MikhmonInstance.DoesNotExist:
            return Response(
                {"detail": "Instance Mikhmon introuvable ou non autorisée."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # CONTRÔLE DE SÉCURITÉ BACKEND STRICT : Unicité du nom de routeur par espace
        if Router.objects.filter(mikhmon_instance=mikhmon_instance, name__iexact=router_name).exists():
            return Response(
                {"detail": f"Un routeur nommé '{router_name}' existe déjà dans cet espace Mikhmon. Veuillez choisir un autre nom."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pricing = PlatformSetting.get_settings()
        price = pricing.router_monthly_price
        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        # CONTRÔLE DE SÉCURITÉ BACKEND STRICT : Solde suffisant
        if not wallet.can_afford(price):
            return Response(
                {
                    "detail": f"Solde insuffisant ({wallet.balance} FCFA). L'ajout d'un routeur coûte {price} FCFA / mois.",
                    "required": price,
                    "balance": wallet.balance,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        with db_transaction.atomic():
            wallet.debit(price)
            expires_at = timezone.now() + timedelta(days=30)

            router = Router.objects.create(
                user=request.user,
                mikhmon_instance=mikhmon_instance,
                name=router_name,
                price_per_month=price,
                auto_renew=auto_renew,
                expires_at=expires_at,
                status=Router.Status.ACTIVE,
            )

            # Allocation VPN séquentielle (Port API 41xxx, Port Winbox 51xxx, IP 10.8.0.x)
            vpn_cred = VpnCredential.allocate_next_credentials(router)

            Transaction.objects.create(
                wallet=wallet,
                amount=price,
                type=Transaction.Type.BUY_ROUTER,
                status=Transaction.Status.COMPLETED,
                payment_method=Transaction.PaymentMethod.WALLET,
                description=f"Abonnement 30 jours pour le routeur '{router.name}'",
            )

        return Response(
            {
                "detail": f"Routeur '{router.name}' créé avec succès !",
                "router": RouterSerializer(router).data,
                "script": vpn_cred.generate_mikrotik_script(),
                "new_balance": float(wallet.balance),
            },
            status=status.HTTP_201_CREATED,
        )


class RouterDetailView(APIView):
    """Détail et suppression d'un routeur avec libération des identifiants VPN."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        try:
            router = Router.objects.get(id=router_id, user=request.user)
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(RouterSerializer(router).data)

    def delete(self, request, router_id):
        try:
            router = Router.objects.get(id=router_id, user=request.user)
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        router_name = router.name
        router.delete()
        return Response(
            {"detail": f"Le routeur '{router_name}' a été supprimé et ses accès VPN libérés."},
            status=status.HTTP_200_OK,
        )


class RenewRouterView(APIView):
    """Renouvellement manuel d'un routeur pour 30 jours supplémentaires."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, router_id):
        try:
            router = Router.objects.get(id=router_id, user=request.user)
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        pricing = PlatformSetting.get_settings()
        price = pricing.router_monthly_price
        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        if not wallet.can_afford(price):
            return Response(
                {
                    "detail": f"Solde insuffisant ({wallet.balance} FCFA). Le renouvellement coûte {price} FCFA.",
                    "required": price,
                    "balance": wallet.balance,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        with db_transaction.atomic():
            wallet.debit(price)
            base_date = router.expires_at if router.expires_at > timezone.now() else timezone.now()
            router.expires_at = base_date + timedelta(days=30)
            router.status = Router.Status.ACTIVE
            router.save(update_fields=["expires_at", "status"])

            Transaction.objects.create(
                wallet=wallet,
                amount=price,
                type=Transaction.Type.BUY_ROUTER,
                status=Transaction.Status.COMPLETED,
                payment_method=Transaction.PaymentMethod.WALLET,
                description=f"Renouvellement 30 jours pour le routeur '{router.name}'",
            )

        return Response({
            "detail": f"Routeur '{router.name}' renouvelé avec succès pour 30 jours supplémentaires !",
            "router": RouterSerializer(router).data,
            "new_balance": float(wallet.balance),
        })


class PingRouterView(APIView):
    """Simule un ping de connectivité du routeur."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, router_id):
        try:
            router = Router.objects.get(id=router_id, user=request.user)
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        router.last_ping = timezone.now()
        router.save(update_fields=["last_ping"])

        return Response({
            "detail": f"Ping réussi pour {router.name}.",
            "last_ping": router.last_ping,
            "status": "ONLINE",
        })
