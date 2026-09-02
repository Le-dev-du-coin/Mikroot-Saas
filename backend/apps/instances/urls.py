from django.urls import re_path
from .views import InstanceDetailView, InstanceListView, PurchaseInstanceView

urlpatterns = [
    re_path(r"^$", InstanceListView.as_view(), name="instance-list"),
    re_path(r"^purchase/?$", PurchaseInstanceView.as_view(), name="instance-purchase"),
    re_path(r"^(?P<instance_id>[0-9a-f-]+)/?$", InstanceDetailView.as_view(), name="instance-detail"),
]
