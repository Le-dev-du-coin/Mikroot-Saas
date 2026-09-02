from django.urls import re_path
from .views import ChangePasswordView, DeleteAccountView, LoginView, LogoutView, MeView, RegisterView

urlpatterns = [
    re_path(r"^register/?$", RegisterView.as_view(), name="account-register"),
    re_path(r"^login/?$", LoginView.as_view(), name="account-login"),
    re_path(r"^logout/?$", LogoutView.as_view(), name="account-logout"),
    re_path(r"^me/?$", MeView.as_view(), name="account-me"),
    re_path(r"^change-password/?$", ChangePasswordView.as_view(), name="account-change-password"),
    re_path(r"^delete-account/?$", DeleteAccountView.as_view(), name="account-delete-account"),
]
