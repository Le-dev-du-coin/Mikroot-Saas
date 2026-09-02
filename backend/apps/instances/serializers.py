from rest_framework import serializers
from apps.routers.serializers import RouterSerializer
from .models import MikhmonInstance


class MikhmonInstanceSerializer(serializers.ModelSerializer):
    subdomain_url = serializers.CharField(read_only=True)
    routers_count = serializers.IntegerField(source="routers.count", read_only=True)
    routers = RouterSerializer(many=True, read_only=True)

    class Meta:
        model = MikhmonInstance
        fields = [
            "id",
            "name",
            "subdomain_url",
            "routeros_version",
            "admin_user",
            "admin_password",
            "is_active",
            "routers_count",
            "routers",
            "created_at",
        ]
        read_only_fields = ["id", "admin_user", "admin_password", "is_active", "routers_count", "routers", "created_at"]


class PurchaseInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MikhmonInstance
        fields = ["name", "routeros_version"]
