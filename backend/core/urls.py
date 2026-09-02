"""Mikroot Core URL Configuration."""
from django.contrib import admin
from django.urls import include, path, re_path

urlpatterns = [
    path("admin/", admin.site.urls),
    re_path(r"^api/accounts/?", include("apps.accounts.urls")),
    re_path(r"^api/billing/?", include("apps.billing.urls")),
    re_path(r"^api/instances/?", include("apps.instances.urls")),
    re_path(r"^api/routers/?", include("apps.routers.urls")),
]

admin.site.site_header = "Mikroot SaaS - SuperAdmin"
admin.site.site_title = "Mikroot Admin Portal"
admin.site.index_title = "Gestion Globale de la Plateforme"
