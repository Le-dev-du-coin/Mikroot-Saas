from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db.models import Sum
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.instances.models import MikhmonInstance
from apps.routers.models import Router
from .models import PlatformSetting, Transaction

User = get_user_model()


class IsSuperAdminUser(permissions.BasePermission):
    """Permission personnalisée réservée aux SuperAdmins."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.role == User.Role.SUPERADMIN or request.user.is_superuser)
        )


class SuperAdminStatsView(APIView):
    """Statistiques globales pour le dashboard SuperAdmin."""
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        technicians_count = User.objects.filter(role=User.Role.TECHNICIAN).count()
        owners_count = User.objects.filter(role=User.Role.OWNER).count()

        total_instances = MikhmonInstance.objects.count()
        total_routers = Router.objects.count()
        active_routers = Router.objects.filter(status=Router.Status.ACTIVE).count()

        total_deposits = (
            Transaction.objects.filter(type=Transaction.Type.DEPOSIT, status=Transaction.Status.COMPLETED).aggregate(
                Sum("amount")
            )["amount__sum"]
            or Decimal("0.00")
        )

        total_spent = (
            Transaction.objects.filter(
                type__in=[Transaction.Type.BUY_INSTANCE, Transaction.Type.BUY_ROUTER, Transaction.Type.AUTO_RENEW],
                status=Transaction.Status.COMPLETED,
            ).aggregate(Sum("amount"))["amount__sum"]
            or Decimal("0.00")
        )

        return Response({
            "kpi": {
                "total_users": total_users,
                "technicians_count": technicians_count,
                "owners_count": owners_count,
                "total_instances": total_instances,
                "total_routers": total_routers,
                "active_routers": active_routers,
                "total_deposits_fcfa": total_deposits,
                "total_platform_revenue_fcfa": total_spent,
            }
        })


class SuperAdminPricingView(APIView):
    """Consultation et modification dynamique des tarifs par le SuperAdmin."""
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        pricing = PlatformSetting.get_settings()
        return Response({
            "mikhmon_instance_price": pricing.mikhmon_instance_price,
            "router_monthly_price": pricing.router_monthly_price,
            "updated_at": pricing.updated_at,
        })

    def put(self, request):
        pricing = PlatformSetting.get_settings()
        inst_price = request.data.get("mikhmon_instance_price")
        router_price = request.data.get("router_monthly_price")

        if inst_price is not None:
            pricing.mikhmon_instance_price = Decimal(str(inst_price))
        if router_price is not None:
            pricing.router_monthly_price = Decimal(str(router_price))

        pricing.save()
        return Response({
            "detail": "Tarifs mis à jour avec succès !",
            "mikhmon_instance_price": pricing.mikhmon_instance_price,
            "router_monthly_price": pricing.router_monthly_price,
            "updated_at": pricing.updated_at,
        })


class SuperAdminClientsView(APIView):
    """Gestion et liste de tous les clients pour le SuperAdmin."""
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        users = User.objects.exclude(role=User.Role.SUPERADMIN).prefetch_related("mikhmon_instances", "routers").select_related("wallet")
        data = []
        for u in users:
            wallet_balance = u.wallet.balance if hasattr(u, "wallet") else Decimal("0.00")
            data.append({
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "phone_number": u.phone_number,
                "country": u.country,
                "role": u.role,
                "role_display": u.get_role_display(),
                "wallet_balance": wallet_balance,
                "instances_count": u.mikhmon_instances.count(),
                "routers_count": u.routers.count(),
                "created_at": u.created_at.strftime("%d/%m/%Y %H:%M"),
                "is_active": u.is_active,
            })
        return Response(data)


class SuperAdminAdjustWalletView(APIView):
    """Ajustement manuel du solde d'un client par le SuperAdmin (Créditer / Débiter)."""
    permission_classes = [IsSuperAdminUser]

    def post(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Client introuvable."}, status=status.HTTP_404_NOT_FOUND)

        amount = Decimal(str(request.data.get("amount", 0)))
        action = request.data.get("action", "CREDIT")  # CREDIT ou DEBIT
        reason = request.data.get("reason", "Ajustement manuel SuperAdmin")

        wallet, _ = Wallet.objects.get_or_create(user=target_user)

        if action == "CREDIT":
            wallet.credit(amount)
            tx_type = Transaction.Type.DEPOSIT
            desc = f"Crédit manuel SuperAdmin : +{amount} FCFA ({reason})"
        elif action == "DEBIT":
            if not wallet.can_afford(amount):
                return Response({"detail": "Solde insuffisant pour ce débit."}, status=status.HTTP_400_BAD_REQUEST)
            wallet.debit(amount)
            tx_type = Transaction.Type.BUY_INSTANCE
            desc = f"Débit manuel SuperAdmin : -{amount} FCFA ({reason})"
        else:
            return Response({"detail": "Action invalide. Choisissez CREDIT ou DEBIT."}, status=status.HTTP_400_BAD_REQUEST)

        Transaction.objects.create(
            wallet=wallet,
            amount=amount,
            type=tx_type,
            status=Transaction.Status.COMPLETED,
            payment_method=Transaction.PaymentMethod.WALLET,
            description=desc,
        )

        return Response({
            "detail": f"Solde de {target_user.email} mis à jour avec succès !",
            "new_balance": wallet.balance,
        })
