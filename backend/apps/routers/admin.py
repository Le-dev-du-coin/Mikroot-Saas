from django.contrib import admin
from .models import Router, VpnCredential


class VpnCredentialInline(admin.StackedInline):
    model = VpnCredential
    can_delete = False
    readonly_fields = ("id", "assigned_ip", "api_port", "winbox_port", "vpn_user", "vpn_password", "created_at")


@admin.register(Router)
class RouterAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "mikhmon_instance", "status", "remaining_days", "expires_at", "created_at")
    list_filter = ("status", "auto_renew", "created_at")
    search_fields = ("name", "user__email", "mikhmon_instance__name")
    inlines = [VpnCredentialInline]
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(VpnCredential)
class VpnCredentialAdmin(admin.ModelAdmin):
    list_display = ("router", "assigned_ip", "api_port", "winbox_port", "vpn_user", "vpn_server")
    search_fields = ("vpn_user", "router__name", "assigned_ip")
    readonly_fields = ("id", "created_at")
