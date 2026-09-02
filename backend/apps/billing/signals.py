from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Wallet


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_wallet(sender, instance, created, **kwargs):
    """Crée automatiquement un Wallet dès qu'un utilisateur est créé."""
    if created:
        Wallet.objects.create(user=instance)
