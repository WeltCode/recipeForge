from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0005_add_observations'),
    ]

    operations = [
        migrations.RenameField(
            model_name='recipe',
            old_name='prep_time_min',
            new_name='prep_time_value',
        ),
        migrations.RenameField(
            model_name='recipe',
            old_name='cook_time_min',
            new_name='cook_time_value',
        ),
        migrations.AddField(
            model_name='recipe',
            name='prep_time_unit',
            field=models.CharField(
                choices=[('min', 'Minutos'), ('h', 'Horas')],
                default='min',
                max_length=3,
            ),
        ),
        migrations.AddField(
            model_name='recipe',
            name='cook_time_unit',
            field=models.CharField(
                choices=[('min', 'Minutos'), ('h', 'Horas')],
                default='min',
                max_length=3,
            ),
        ),
    ]
