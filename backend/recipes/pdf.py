import os
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    FrameBreak,
    Image,
    KeepInFrame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

_LOGO_PATH = os.path.join(
    os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'assets', 'ldt.png'
)


def _styles():
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name='RecipeTitle',
            parent=styles['Title'],
            fontName='Helvetica-Bold',
            fontSize=28,
            leading=28,
            textColor=colors.white,
            spaceAfter=2 * mm,
        )
    )
    styles.add(
        ParagraphStyle(
            name='RecipeCategory',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor('#f4b646'),
            spaceAfter=1.5 * mm,
        )
    )
    styles.add(
        ParagraphStyle(
            name='RecipeDesc',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10.5,
            leading=14,
            textColor=colors.HexColor('#f0e8db'),
        )
    )
    styles.add(
        ParagraphStyle(
            name='SectionLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=7,
            leading=8,
            textColor=colors.HexColor('#c17f10'),
            alignment=1,
            spaceAfter=2 * mm,
        )
    )
    styles.add(
        ParagraphStyle(
            name='GroupTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=7.8,
            leading=9,
            textColor=colors.HexColor('#b21f17'),
            spaceAfter=1.5 * mm,
        )
    )
    styles.add(
        ParagraphStyle(
            name='IngredientName',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.2,
            leading=11,
            textColor=colors.HexColor('#2f2a24'),
        )
    )
    styles.add(
        ParagraphStyle(
            name='IngredientNote',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=7.8,
            leading=9,
            textColor=colors.HexColor('#7b7368'),
        )
    )
    styles.add(
        ParagraphStyle(
            name='StepTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.8,
            leading=10,
            textColor=colors.HexColor('#1a1714'),
            spaceAfter=1.5 * mm,
        )
    )
    styles.add(
        ParagraphStyle(
            name='StepText',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.6,
            leading=11.5,
            textColor=colors.HexColor('#2f2a24'),
        )
    )
    styles.add(
        ParagraphStyle(
            name='TipText',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=7.8,
            leading=10,
            textColor=colors.HexColor('#8e6610'),
        )
    )
    styles.add(
        ParagraphStyle(
            name='Footer',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=6.8,
            leading=8,
            textColor=colors.HexColor('#7b7368'),
            alignment=1,
        )
    )

    return styles


def _header(recipe, styles, photo_path=None):
    photo_cell = None

    if photo_path:
        try:
            photo_elem = Image(photo_path, width=73 * mm, height=62 * mm)
            photo_cell = [[photo_elem]]
        except (OSError, IOError):
            photo_cell = None

    if photo_cell is None:
        # Logo Leche de Tigre como texto estilizado
        logo_style = ParagraphStyle(
            'LogoMain', fontName='Helvetica-Bold', fontSize=24, leading=22,
            textColor=colors.white, alignment=1,
        )
        logo_sub_style = ParagraphStyle(
            'LogoSub', fontName='Helvetica-Bold', fontSize=18, leading=16,
            textColor=colors.white, alignment=1,
        )
        photo_cell = [[
            Table(
                [[Paragraph('LECHE', logo_style)],
                 [Paragraph('DE TIGRE', logo_sub_style)]],
                colWidths=[73 * mm],
                style=TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('TOPPADDING', (0, 0), (-1, -1), 15),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
                ])
            )
        ]]

    photo_box = Table(
        photo_cell,
        colWidths=[73 * mm],
        rowHeights=[62 * mm],
        style=TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#161412')),
                ('BOX', (0, 0), (-1, -1), 0.35, colors.HexColor('#f4b646')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ]
        ),
    )

    right_cell = [
        Paragraph('PLATO PRINCIPAL - COCINA TRADICIONAL', styles['RecipeCategory']),
        Spacer(1, 3 * mm),
        Paragraph(recipe.name or 'Nombre de la receta', styles['RecipeTitle']),
        Spacer(1, 2.5 * mm),
        Paragraph(
            recipe.description or 'Descripcion breve de la receta y de su tecnica principal.',
            styles['RecipeDesc'],
        ),
        Spacer(1, 3.5 * mm),
        Paragraph(f'Codigo {recipe.code or "FT-000"}', styles['RecipeCategory']),
    ]

    return Table(
        [[photo_box, right_cell]],
        colWidths=[73 * mm, 120 * mm],
        style=TableStyle(
            [
                ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#161412')),
                ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#161412')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (0, 0), 0),
                ('RIGHTPADDING', (0, 0), (0, 0), 0),
                ('TOPPADDING', (0, 0), (0, 0), 0),
                ('BOTTOMPADDING', (0, 0), (0, 0), 0),
                ('LEFTPADDING', (1, 0), (1, 0), 8 * mm),
                ('RIGHTPADDING', (1, 0), (1, 0), 0 * mm),
                ('TOPPADDING', (1, 0), (1, 0), 8 * mm),
                ('BOTTOMPADDING', (1, 0), (1, 0), 8 * mm),
            ]
        ),
    )


def _stats(recipe, styles):
    values = [
        (str(recipe.servings or 1), 'Porciones'),
        (f'{recipe.yield_grams} g' if recipe.yield_grams else '---', 'Gramaje'),
        (f'{recipe.prep_time_min or 0} min', 'Preparacion'),
        (f'{recipe.cook_time_min or 0} min', 'Coccion'),
        (f'{recipe.service_temp_c} C' if recipe.service_temp_c else '---', 'Tiempo de vida'),
    ]

    return Table(
        [
            [Paragraph(f'<b>{value}</b>', styles['SectionLabel']) for value, _ in values],
            [Paragraph(label.upper(), styles['Footer']) for _, label in values],
        ],
        colWidths=[36 * mm] * 5,
        rowHeights=[11 * mm, 7 * mm],
        style=TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#efe6d8')),
                ('BOX', (0, 0), (-1, -1), 0.35, colors.HexColor('#1a1714')),
                ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#1a1714')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]
        ),
    )


def _ingredients_story(ingredients_by_group, styles):
    story = [Paragraph('Ingredientes', styles['SectionLabel'])]

    for group_name, items in ingredients_by_group:
        story.append(Paragraph(group_name, styles['GroupTitle']))
        for item in items:
            qty = Paragraph(f'{item.quantity} {item.unit}', styles['IngredientName'])
            name = Paragraph(item.ingredient_name or 'Insumo', styles['IngredientName'])
            right_content = [name]
            if item.note:
                right_content.append(Paragraph(item.note, styles['IngredientNote']))

            story.append(
                Table(
                    [[qty, right_content]],
                    colWidths=[15 * mm, 34 * mm],
                    style=TableStyle(
                        [
                            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                            ('LEFTPADDING', (0, 0), (0, 0), 0),
                            ('RIGHTPADDING', (0, 0), (0, 0), 1.2 * mm),
                            ('LEFTPADDING', (1, 0), (1, 0), 1.2 * mm),
                            ('RIGHTPADDING', (1, 0), (1, 0), 0),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5 * mm),
                            ('LINEBELOW', (0, 0), (-1, 0), 0.2, colors.HexColor('#ece5d8')),
                        ]
                    ),
                )
            )

        story.append(Spacer(1, 2 * mm))

    return story


def _steps_story(steps, styles):
    story = [Paragraph('Proceso paso a paso', styles['SectionLabel'])]

    for index, step in enumerate(steps, start=1):
        number = Table(
            [[Paragraph(str(index), styles['SectionLabel'])]],
            colWidths=[8 * mm],
            rowHeights=[8 * mm],
            style=TableStyle(
                [
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1a1714')),
                    ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#f4b646')),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]
            ),
        )

        block = [
            Paragraph(step.title or f'Paso {index}', styles['StepTitle']),
            Paragraph(step.instruction or 'Descripcion del paso de produccion.', styles['StepText']),
        ]
        if step.tip:
            block.append(Spacer(1, 1.5 * mm))
            block.append(Paragraph(step.tip, styles['TipText']))

        story.append(
            Table(
                [[number, block]],
                colWidths=[10 * mm, 98 * mm],
                style=TableStyle(
                    [
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('LEFTPADDING', (0, 0), (0, 0), 0),
                        ('RIGHTPADDING', (0, 0), (0, 0), 1.5 * mm),
                        ('LEFTPADDING', (1, 0), (1, 0), 2 * mm),
                        ('RIGHTPADDING', (1, 0), (1, 0), 0),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2 * mm),
                    ]
                ),
            )
        )

    return story


def build_recipe_pdf(recipe, ingredients_by_group, steps, photo_path=None):
    styles = _styles()
    buffer = BytesIO()

    logo_bar_height = 20 * mm
    left_margin = 12 * mm
    right_margin = 12 * mm
    top_margin = logo_bar_height + 8 * mm
    bottom_margin = 12 * mm

    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
        title=f'{recipe.code} - {recipe.name}',
    )

    page_width, page_height = A4
    body_width = page_width - left_margin - right_margin
    header_height = 100 * mm  # Altura header con foto más grande
    stats_height = 25 * mm  # Altura stats bar
    body_height = page_height - top_margin - bottom_margin - header_height - stats_height - 4 * mm
    left_width = 75 * mm  # Columna ingredientes (aprox 220px)
    right_width = body_width - left_width

    header_frame = Frame(
        left_margin,
        page_height - top_margin - header_height,
        body_width,
        header_height,
        id='header',
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    stats_frame = Frame(
        left_margin,
        page_height - top_margin - header_height - stats_height,
        body_width,
        stats_height,
        id='stats',
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    left_frame = Frame(
        left_margin,
        bottom_margin + 4 * mm,
        left_width,
        body_height,
        id='left',
        leftPadding=0,
        rightPadding=3 * mm,
        topPadding=0,
        bottomPadding=0,
    )
    right_frame = Frame(
        left_margin + left_width,
        bottom_margin + 4 * mm,
        right_width,
        body_height,
        id='right',
        leftPadding=3 * mm,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )

    def on_page(canvas, _document):
        canvas.saveState()

        # Fondo general crema
        canvas.setFillColor(colors.HexColor('#f6efe4'))
        canvas.rect(0, 0, page_width, page_height, stroke=0, fill=1)

        # Barra superior de logo
        logo_bar_y = page_height - logo_bar_height
        canvas.setFillColor(colors.HexColor('#f0ebe0'))
        canvas.rect(0, logo_bar_y, page_width, logo_bar_height, stroke=0, fill=1)
        # Linea separadora de la barra
        canvas.setStrokeColor(colors.HexColor('#c8bfb0'))
        canvas.setLineWidth(0.4)
        canvas.line(0, logo_bar_y, page_width, logo_bar_y)

        # Logo LDT
        logo_path = os.path.normpath(_LOGO_PATH)
        if os.path.exists(logo_path):
            canvas.drawImage(
                logo_path,
                left_margin,
                logo_bar_y + 3 * mm,
                width=36 * mm,
                height=14 * mm,
                preserveAspectRatio=True,
                anchor='sw',
                mask='auto',
            )

        # Texto derecho de la barra: FICHA TECNICA + codigo
        canvas.setFont('Helvetica', 6.5)
        canvas.setFillColor(colors.HexColor('#9b9080'))
        canvas.drawRightString(
            page_width - right_margin, logo_bar_y + 12 * mm, 'FICHA TECNICA DE PRODUCCION'
        )
        canvas.setFont('Helvetica-Bold', 9.5)
        canvas.setFillColor(colors.HexColor('#1a1714'))
        canvas.drawRightString(
            page_width - right_margin,
            logo_bar_y + 4.5 * mm,
            f'{recipe.code or "FT-000"} / REV.01',
        )

        # Linea horizontal entre header y body
        canvas.setStrokeColor(colors.HexColor('#1a1714'))
        canvas.setLineWidth(0.6)
        canvas.line(
            left_margin,
            page_height - top_margin - header_height - stats_height,
            page_width - right_margin,
            page_height - top_margin - header_height - stats_height,
        )
        # Linea vertical entre columnas del body
        canvas.line(
            left_margin + left_width,
            bottom_margin,
            left_margin + left_width,
            page_height - top_margin - header_height - stats_height,
        )

        # Footer
        canvas.setFont('Helvetica-Bold', 7)
        canvas.setFillColor(colors.HexColor('#7b7368'))
        canvas.drawString(left_margin, 6 * mm, 'RecipeForge - Ficha tecnica')
        canvas.drawCentredString(page_width / 2, 6 * mm, recipe.code or 'FT-000')
        canvas.drawRightString(page_width - right_margin, 6 * mm, '1 / 1')
        canvas.restoreState()

    doc.addPageTemplates([PageTemplate(id='RecipeForgeA4', frames=[header_frame, stats_frame, left_frame, right_frame], onPage=on_page)])

    story = [
        _header(recipe, styles, photo_path=photo_path),
        _stats(recipe, styles),
        FrameBreak(),
        Spacer(1, 0.1 * mm),
    ]
    story.extend(_ingredients_story(ingredients_by_group, styles))
    story.append(FrameBreak())
    story.extend(_steps_story(steps, styles))

    doc.build(story)
    return buffer.getvalue()