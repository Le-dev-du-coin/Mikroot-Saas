from django.contrib import admin
from .models import PlatformSetting, Transaction, Wallet


@admin.register(PlatformSetting)
class PlatformSettingAdmin(admin.ModelAdmin):
    list_display = ("__str__", "mikhmon_instance_price", "router_monthly_price", "updated_at")


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("user", "balance", "updated_at")
    search_fields = ("user__email", "user__full_name")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("wallet", "amount", "type", "payment_method", "status", "reference", "created_at")
    list_filter = ("type", "status", "payment_method", "created_at")
    search_fields = ("wallet__user__email", "reference")
    readonly_fields = ("id", "created_at")
