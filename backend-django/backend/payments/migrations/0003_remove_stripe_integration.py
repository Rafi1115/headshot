# Generated migration to remove Stripe integration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0002_stripeevent_event_type_payment_stripeevent_payment_and_more"),
    ]

    operations = [
        migrations.DeleteModel(
            name="StripeEvent",
        ),
        migrations.AlterField(
            model_name="payment",
            name="provider",
            field=models.CharField(default="pending", max_length=50),
        ),
    ]
