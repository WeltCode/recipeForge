# Los 14 alérgenos de declaración obligatoria en la UE (Reglamento 1169/2011).
# `key` estable (se guarda en la base de datos), `label` en español para mostrar.
EU_ALLERGENS = [
    ('gluten', 'Cereales con gluten'),
    ('crustaceos', 'Crustáceos'),
    ('huevos', 'Huevos'),
    ('pescado', 'Pescado'),
    ('cacahuetes', 'Cacahuetes'),
    ('soja', 'Soja'),
    ('lacteos', 'Lácteos'),
    ('frutos_cascara', 'Frutos de cáscara'),
    ('apio', 'Apio'),
    ('mostaza', 'Mostaza'),
    ('sesamo', 'Granos de sésamo'),
    ('sulfitos', 'Dióxido de azufre y sulfitos'),
    ('altramuces', 'Altramuces'),
    ('moluscos', 'Moluscos'),
]

ALLERGEN_KEYS = [k for k, _ in EU_ALLERGENS]
ALLERGEN_LABELS = dict(EU_ALLERGENS)


def clean_allergens(values):
    """Normaliza una lista de alérgenos: solo claves válidas, sin duplicados,
    en el orden oficial de los 14 UE."""
    if not values:
        return []
    chosen = {v for v in values if v in ALLERGEN_KEYS}
    return [k for k in ALLERGEN_KEYS if k in chosen]
