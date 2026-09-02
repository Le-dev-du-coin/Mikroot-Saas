from decimal import Decimal
from django.conf import settings
from django.db import transaction as db_transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.billing.models import PlatformSetting, Transaction, Wallet
from .models import MikhmonInstance
from .serializers import MikhmonInstanceSerializer, PurchaseInstanceSerializer


class InstanceListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        instances = MikhmonInstance.objects.filter(user=request.user).prefetch_related("routers__vpn_credential")
        return Response(MikhmonInstanceSerializer(instances, many=True).data)


class PurchaseInstanceView(APIView):
    """Achat d'une instance Mikhmon (Tarif dynamique configurable par SuperAdmin)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PurchaseInstanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pricing = PlatformSetting.get_settings()
        price = pricing.mikhmon_instance_price
        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        if not wallet.can_afford(price):
            return Response(
                {
                    "detail": f"Solde insuffisant ({wallet.balance} FCFA). L'achat d'une instance coûte {price} FCFA.",
                    "required": price,
                    "balance": wallet.balance,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        with db_transaction.atomic():
            wallet.debit(price)
            instance = serializer.save(user=request.user)

            Transaction.objects.create(
                wallet=wallet,
                amount=price,
                type=Transaction.Type.BUY_INSTANCE,
                status=Transaction.Status.COMPLETED,
                payment_method=Transaction.PaymentMethod.WALLET,
                description=f"Achat de l'instance Mikhmon '{instance.name}'",
            )

        return Response(
            {
                "detail": f"Instance '{instance.name}' créée avec succès !",
                "instance": MikhmonInstanceSerializer(instance).data,
                "new_balance": wallet.balance,
            },
            status=status.HTTP_201_CREATED,
        )


class InstanceDetailView(APIView):
    """Détail et suppression d'un espace Mikhmon."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, instance_id):
        try:
            instance = MikhmonInstance.objects.get(id=instance_id, user=request.user)
        except MikhmonInstance.DoesNotExist:
            return Response({"detail": "Instance introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(MikhmonInstanceSerializer(instance).data)

    def delete(self, request, instance_id):
        try:
            instance = MikhmonInstance.objects.get(id=instance_id, user=request.user)
        except MikhmonInstance.DoesNotExist:
            return Response({"detail": "Instance introuvable."}, status=status.HTTP_404_NOT_FOUND)

        # RÈGLE MÉTIER STRICTE : Impossible de supprimer un espace avec des routeurs
        router_count = instance.routers.count()
        if router_count > 0:
            return Response(
                {
                    "detail": f"Impossible de supprimer cet espace : il contient encore {router_count} routeur(s) associé(s). Veuillez d'abord supprimer ou déplacer ces routeurs.",
                    "routers_count": router_count,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance_name = instance.name
        instance.delete()
        return Response(
            {"detail": f"L'espace Mikhmon '{instance_name}' a été supprimé avec succès."},
            status=status.HTTP_200_OK,
        )
