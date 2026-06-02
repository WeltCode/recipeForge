import os
import base64
from io import BytesIO
from django.template.loader import render_to_string


def build_recipe_pdf_from_html(recipe, ingredients_by_group, steps, photo_path=None):
    """
    Genera un PDF a partir del template HTML usando WeasyPrint.
    """
    try:
        from weasyprint import HTML, CSS
    except ImportError:
        raise ImportError("WeasyPrint no está instalado. Instálalo con: pip install weasyprint")

    # Leer y convertir logo a base64
    logo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'assets', 'ldt.png')
    with open(logo_path, 'rb') as f:
        logo_base64 = base64.b64encode(f.read()).decode()

    # Leer y convertir foto a base64 si existe
    photo_data = None
    if photo_path and os.path.exists(photo_path):
        with open(photo_path, 'rb') as f:
            photo_data = base64.b64encode(f.read()).decode()

    # Preparar contexto del template
    context = {
        'recipe': recipe,
        'ingredients_by_group': ingredients_by_group,
        'steps': steps,
        'logo_base64': logo_base64,
        'photo_data': photo_data,
    }

    # Renderizar template HTML
    html_string = render_to_string('recipe_sheet.html', context)

    # Generar PDF con WeasyPrint
    pdf_file = HTML(string=html_string).write_pdf()

    return pdf_file
