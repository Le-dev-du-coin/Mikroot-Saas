from decimal import Decimal
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Transaction, Wallet
from .serializers import DepositRequestSerializer, TransactionSerializer, WalletSerializer


class MyWalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        return Response(WalletSerializer(wallet).data)


class DepositView(APIView):
    """Permet à l'utilisateur de simuler ou initier une recharge de Wallet."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DepositRequestSerializer(data=request.data)
        if serializer.is_valid():
            wallet, _ = Wallet.objects.get_or_create(user=request.user)
            amount = Decimal(serializer.validated_data["amount"])
            method = serializer.validated_data["payment_method"]
            ref = serializer.validated_data.get("reference", "")

            # En dev/mode standard, on crédite et on crée la transaction complétée
            wallet.credit(amount)
            transaction = Transaction.objects.create(
                wallet=wallet,
                amount=amount,
                type=Transaction.Type.DEPOSIT,
                status=Transaction.Status.COMPLETED,
                payment_method=method,
                reference=ref,
                description=f"Recharge de {amount} FCFA via {method}",
            )
            return Response(
                {
                    "detail": f"Recharge de {amount} FCFA effectuée avec succès.",
                    "balance": wallet.balance,
                    "transaction": TransactionSerializer(transaction).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
