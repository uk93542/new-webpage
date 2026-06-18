from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('rides', '0002_auth_profiles_notifications'),
    ]

    operations = [
        migrations.AddField(model_name='ride', name='from_address', field=models.CharField(default='Surathkal', max_length=200)),
        migrations.AddField(model_name='ride', name='to_address', field=models.CharField(default='Surathkal', max_length=200)),
        migrations.CreateModel(
            name='RideChatMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sender_name', models.CharField(max_length=100)),
                ('message', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('ride', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chat_messages', to='rides.ride')),
                ('sender_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ride_chat_messages', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
