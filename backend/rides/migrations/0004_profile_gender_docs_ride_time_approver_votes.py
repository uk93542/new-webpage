from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('rides', '0003_ride_locations_chat'),
    ]

    operations = [
        migrations.AddField('userprofile', 'gender', models.CharField(blank=True, choices=[('male', 'Male'), ('female', 'Female')], default='', max_length=10)),
        migrations.AddField('userprofile', 'id_document', models.TextField(blank=True, default='')),
        migrations.AddField('ride', 'approver_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approving_rides', to=settings.AUTH_USER_MODEL)),
        migrations.AddField('ride', 'ride_time', models.TimeField(default='09:00')),
        migrations.AlterField('ride', 'place', models.CharField(choices=[('station', 'Station'), ('airport', 'Airport')], default='station', max_length=20)),
        migrations.CreateModel(
            name='RideRemovalVote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('ride', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='removal_votes', to='rides.ride')),
                ('target_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='removal_votes_received', to=settings.AUTH_USER_MODEL)),
                ('voter_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='removal_votes_cast', to=settings.AUTH_USER_MODEL)),
            ],
            options={'unique_together': {('ride', 'voter_user', 'target_user')}},
        ),
    ]
