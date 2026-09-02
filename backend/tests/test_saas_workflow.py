import pytest
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.billing.models import PlatformSetting, Transaction, Wallet
from apps.instances.models import MikhmonInstance
from apps.routers.models import Router, VpnCredential

User = get_user_model()


@pytest.mark.django_db
class TestMikrootSaaSWorkflow:
    def setup_method(self):
        self.client = APIClient()
        self.technician = User.objects.create_user(
            email="tech@mikroot.net",
            password="StrongPassword123!",
            full_name="Technicien Alpha",
            phone_number="+22370000001",
            country="Mali",
            role=User.Role.TECHNICIAN,
        )
        self.superadmin = User.objects.create_superuser(
            email="admin@mikroot.net",
            password="SuperPassword123!",
            full_name="Super Admin",
        )

    def test_wallet_auto_created_on_registration(self):
        """Vérifie que le wallet est automatiquement créé avec solde 0."""
        wallet = Wallet.objects.get(user=self.technician)
        assert wallet.balance == Decimal("0.00")

    def test_deposit_wallet(self):
        """Vérifie la recharge de compte."""
        self.client.force_authenticate(user=self.technician)
        response = self.client.post(
            "/api/billing/deposit/",
            {
                "amount": "10000.00",
                "payment_method": "ORANGE_MONEY",
                "reference": "OM-123456",
            },
        )
        assert response.status_code == 201
        wallet = Wallet.objects.get(user=self.technician)
        assert wallet.balance == Decimal("10000.00")
        assert Transaction.objects.filter(wallet=wallet, type="DEPOSIT").count() == 1

    def test_technician_multi_mikhmon_and_routers_workflow(self):
        """Le technicien achète 2 Mikhmon distincts et y ajoute des routeurs."""
        self.client.force_authenticate(user=self.technician)
        wallet = Wallet.objects.get(user=self.technician)
        wallet.credit(Decimal("5000.00"))

        # 1. Achat du Mikhmon Client 1
        inst1_resp = self.client.post("/api/instances/purchase/", {"name": "hotel-etoile", "routeros_version": "V7"})
        assert inst1_resp.status_code == 201
        inst1_id = inst1_resp.data["instance"]["id"]

        # 2. Achat du Mikhmon Client 2
        inst2_resp = self.client.post("/api/instances/purchase/", {"name": "cyber-nord", "routeros_version": "V7"})
        assert inst2_resp.status_code == 201
        inst2_id = inst2_resp.data["instance"]["id"]

        # 3. Ajout de 2 routeurs pour le Client 1
        r1_resp = self.client.post(
            "/api/routers/create/",
            {"name": "hotel-r1", "mikhmon_instance_id": inst1_id},
        )
        assert r1_resp.status_code == 201
        r1_id = r1_resp.data["router"]["id"]

        r2_resp = self.client.post(
            "/api/routers/create/",
            {"name": "hotel-r2", "mikhmon_instance_id": inst1_id},
        )
        assert r2_resp.status_code == 201

        # RÈGLE MÉTIER : Suppression impossible de l'espace 1 tant qu'il a des routeurs
        del_inst1_fail = self.client.delete(f"/api/instances/{inst1_id}/")
        assert del_inst1_fail.status_code == 400
        assert "Impossible de supprimer cet espace" in del_inst1_fail.data["detail"]

        # 4. Renouvellement du routeur 1 (+30 jours)
        renew_resp = self.client.post(f"/api/routers/{r1_id}/renew/")
        assert renew_resp.status_code == 200
        assert "renouvelé avec succès" in renew_resp.data["detail"]

        # 5. Suppression des 2 routeurs de l'espace 1
        del_r1 = self.client.delete(f"/api/routers/{r1_id}/")
        assert del_r1.status_code == 200
        r2_id = r2_resp.data["router"]["id"]
        del_r2 = self.client.delete(f"/api/routers/{r2_id}/")
        assert del_r2.status_code == 200

        # 6. Maintenant que l'espace 1 est vide, la suppression réussit
        del_inst1_success = self.client.delete(f"/api/instances/{inst1_id}/")
        assert del_inst1_success.status_code == 200
        assert MikhmonInstance.objects.filter(id=inst1_id).count() == 0

    def test_superadmin_custom_panel_and_dynamic_pricing(self):
        """Le SuperAdmin consulte les stats globales et modifie les tarifs dynamiquement."""
        self.client.force_authenticate(user=self.superadmin)

        # 1. Vérification des stats
        stats_resp = self.client.get("/api/billing/superadmin/stats/")
        assert stats_resp.status_code == 200
        assert "kpi" in stats_resp.data

        # 2. Modification des tarifs
        pricing_resp = self.client.put(
            "/api/billing/superadmin/pricing/",
            {
                "mikhmon_instance_price": "1500.00",
                "router_monthly_price": "750.00",
            },
        )
        assert pricing_resp.status_code == 200
        assert Decimal(pricing_resp.data["mikhmon_instance_price"]) == Decimal("1500.00")
