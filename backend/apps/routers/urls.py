from django.urls import re_path
from .views import CreateRouterView, PingRouterView, RenewRouterView, RouterDetailView, RouterListView

urlpatterns = [
    re_path(r"^$", RouterListView.as_view(), name="router-list"),
    re_path(r"^create/?$", CreateRouterView.as_view(), name="router-create"),
    re_path(r"^(?P<router_id>[0-9a-f-]+)/?$", RouterDetailView.as_view(), name="router-detail"),
    re_path(r"^(?P<router_id>[0-9a-f-]+)/renew/?$", RenewRouterView.as_view(), name="router-renew"),
    re_path(r"^(?P<router_id>[0-9a-f-]+)/ping/?$", PingRouterView.as_view(), name="router-ping"),
]
