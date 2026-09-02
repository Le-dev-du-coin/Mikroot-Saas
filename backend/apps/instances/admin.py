from django.contrib import admin
from .models import MikhmonInstance


@admin.register(MikhmonInstance)
class MikhmonInstanceAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "routeros_version", "is_active", "created_at")
    list_filter = ("routeros_version", "is_active", "created_at")
    search_fields = ("name", "user__email")
    readonly_fields = ("id", "created_at", "updated_at")
