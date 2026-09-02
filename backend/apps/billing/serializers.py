from rest_framework import serializers
from .models import Transaction, Wallet


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id",
            "amount",
            "type",
            "status",
            "payment_method",
            "reference",
            "description",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]


class WalletSerializer(serializers.ModelSerializer):
    transactions = TransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Wallet
        fields = ["id", "balance", "updated_at", "transactions"]
        read_only_fields = ["id", "balance", "updated_at"]


class DepositRequestSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=100)
    payment_method = serializers.ChoiceField(choices=Transaction.PaymentMethod.choices)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
