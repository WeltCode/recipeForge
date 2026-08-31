"""Correos transaccionales de RecipeForge.

Todo el envío pasa por `send_mail_safe`, que NUNCA lanza: si el correo no está
configurado (sin credenciales) o el envío falla, se registra y se sigue. Así una
alta o un reset jamás se rompen por un problema de correo.
"""
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

BRAND = 'RecipeForge'


def send_mail_safe(subject, body, to, html=None, reply_to=None):
    """Envía un correo sin romper la petición. Devuelve True si se entregó al
    backend, False si estaba desactivado o hubo error."""
    if not to:
        return False
    recipients = [to] if isinstance(to, str) else list(to)
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            to=recipients,
            reply_to=[reply_to] if reply_to else None,
        )
        if html:
            msg.attach_alternative(html, 'text/html')
        msg.send(fail_silently=False)
        return True
    except Exception:
        logger.warning('No se pudo enviar el correo "%s" a %s', subject, recipients, exc_info=True)
        return False


def _wrap_html(title, inner):
    """Envoltura HTML mínima y sobria (sin depender de imágenes externas)."""
    return f"""\
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f4f0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e8e3da;border-radius:14px;overflow:hidden">
    <div style="background:#17130f;padding:18px 24px">
      <span style="color:#ff9a3d;font-weight:700;letter-spacing:.5px;font-size:18px">{BRAND}</span>
    </div>
    <div style="padding:24px">
      <h1 style="margin:0 0 12px;font-size:19px;color:#1b1712">{title}</h1>
      {inner}
    </div>
    <div style="padding:14px 24px;border-top:1px solid #eee;color:#9a9186;font-size:12px">
      {BRAND} · Fichas técnicas, escandallo y carta QR para tu restaurante.
    </div>
  </div>
</div>"""


def _display_name(user):
    return (getattr(user, 'first_name', '') or getattr(user, 'username', '') or '').strip() or 'Hola'


_MONTHS_ES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
              'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']


def _fmt_date_es(dt):
    return f'{dt.day} de {_MONTHS_ES[dt.month]} de {dt.year}' if dt else ''


def _email_btn(url, label):
    """Botón CTA en tabla (compatible con la mayoría de clientes de correo)."""
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0">'
        f'<tr><td style="border-radius:10px;background:linear-gradient(180deg,#ff7a34,#e8531f)">'
        f'<a href="{url}" style="display:inline-block;padding:13px 26px;color:#fff;text-decoration:none;'
        f'font-weight:700;font-size:15px;letter-spacing:.3px">{label}</a></td></tr></table>'
    )


def send_welcome_email(user, restaurant):
    """Bienvenida llamativa al crear la cuenta (alta autoservicio a la Prueba)."""
    name = _display_name(user)
    login_url = getattr(settings, 'FRONTEND_BASE_URL', '')
    trial = _fmt_date_es(getattr(restaurant, 'trial_ends_at', None))
    trial_line = f'Tu prueba gratuita está activa hasta el <strong>{trial}</strong>.' if trial else 'Tu prueba gratuita ya está activa.'
    trial_txt = f'Tu prueba gratuita está activa hasta el {trial}.' if trial else 'Tu prueba gratuita ya está activa.'

    subject = f'¡Bienvenido a {BRAND}, {name}! 🔥'
    body = (
        f'Hola {name},\n\n'
        f'Tu cocina "{restaurant.name}" ya está en marcha en {BRAND}. {trial_txt}\n\n'
        f'Con {BRAND} puedes:\n'
        f'  • Estandarizar tus fichas técnicas e imprimirlas en A4.\n'
        f'  • Calcular escandallos, food cost y márgenes.\n'
        f'  • Llevar inventario y proveedores.\n'
        f'  • Publicar tu carta digital con QR.\n\n'
        f'Entra a tu cocina: {login_url}\n\n'
        f'¿Dudas? Responde a este correo y te ayudamos.\n\n'
        f'— El equipo de {BRAND}'
    )

    feature = lambda txt: (  # noqa: E731
        f'<tr><td style="padding:7px 0;color:#3a352e;font-size:14.5px;line-height:1.4">'
        f'<span style="color:#e8531f;font-weight:700">✦</span>&nbsp;&nbsp;{txt}</td></tr>'
    )
    html = f"""\
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f4f0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8e3da;border-radius:16px;overflow:hidden">
    <div style="background:#17130f;background-image:linear-gradient(135deg,#1c1712,#0e0b09);padding:30px 28px 26px">
      <div style="color:#ff9a3d;font-weight:800;letter-spacing:.5px;font-size:20px">{BRAND}</div>
      <div style="color:#a79b8c;font-size:12.5px;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px">Cocina profesional</div>
      <h1 style="margin:18px 0 0;font-size:26px;line-height:1.15;color:#fff;font-weight:800">
        Tu cocina ya está<br><span style="color:#ff7a34">en marcha</span>, {name}
      </h1>
    </div>
    <div style="padding:26px 28px">
      <p style="margin:0 0 6px;color:#3a352e;font-size:15px;line-height:1.6">
        Tu cuenta para <strong>{restaurant.name}</strong> está lista. {trial_line}
      </p>
      <p style="margin:18px 0 8px;color:#7a736b;font-size:12.5px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Todo lo que puedes hacer</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        {feature('Estandariza tus <strong>fichas técnicas</strong> e imprímelas en A4.')}
        {feature('Calcula <strong>escandallos</strong>, food cost y márgenes.')}
        {feature('Lleva <strong>inventario</strong> y <strong>proveedores</strong>.')}
        {feature('Publica tu <strong>carta digital con QR</strong>.')}
      </table>
      {_email_btn(login_url, 'Entrar a mi cocina →')}
      <p style="margin:6px 0 0;color:#9a9186;font-size:12.5px">
        Si el botón no funciona, copia este enlace:<br>
        <a href="{login_url}" style="color:#b0552b">{login_url}</a>
      </p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #eee;color:#9a9186;font-size:12px">
      {BRAND} · Fichas técnicas, escandallo y carta QR para tu restaurante.<br>
      ¿Dudas? Responde a este correo y te ayudamos.
    </div>
  </div>
</div>"""
    return send_mail_safe(subject, body, user.email, html=html)


def send_admin_new_signup(restaurant, user):
    """Aviso al admin de cada alta nueva: plan, tipo de cuenta y datos de contacto."""
    from django.utils import timezone
    to = getattr(settings, 'ADMIN_NOTIFY_EMAIL', None)
    prof = getattr(user, 'profile', None)
    phone = (getattr(prof, 'phone', '') or '').strip() or '—'
    contact = (user.get_full_name() or user.first_name or user.username or '—').strip()
    email = user.email or user.username
    tipo = restaurant.get_business_type_display() if hasattr(restaurant, 'get_business_type_display') else '—'
    plan = restaurant.get_plan_display()
    fecha = _fmt_date_es(timezone.localtime()) if timezone else ''

    subject = f'🆕 Alta nueva · {restaurant.name} · {plan}'
    rows = [
        ('Tipo de cuenta', tipo),
        ('Negocio', restaurant.name),
        ('Plan', plan),
        ('Contacto', contact),
        ('Correo', email),
        ('Teléfono', phone),
        ('Moneda', restaurant.currency),
        ('Fecha', fecha),
    ]
    body = f'Nueva cuenta en {BRAND}.\n\n' + '\n'.join(f'{k}: {v}' for k, v in rows)

    def _row(k, v, accent=False):
        vstyle = 'color:#e8531f;font-weight:700' if accent else 'color:#1b1712;font-weight:600'
        return (
            f'<tr>'
            f'<td style="padding:9px 14px;border-bottom:1px solid #eee;color:#8a837a;font-size:13px;white-space:nowrap">{k}</td>'
            f'<td style="padding:9px 14px;border-bottom:1px solid #eee;{vstyle};font-size:14px">{v}</td>'
            f'</tr>'
        )
    rows_html = (
        _row('Tipo de cuenta', tipo)
        + _row('Negocio', restaurant.name)
        + _row('Plan', plan, accent=True)
        + _row('Contacto', contact)
        + _row('Correo', f'<a href="mailto:{email}" style="color:#b0552b">{email}</a>')
        + _row('Teléfono', phone)
        + _row('Moneda', restaurant.currency)
        + _row('Fecha', fecha)
    )
    html = f"""\
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f4f0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e8e3da;border-radius:14px;overflow:hidden">
    <div style="background:#17130f;padding:18px 22px">
      <span style="color:#ff9a3d;font-weight:800;font-size:16px">{BRAND}</span>
      <span style="color:#a79b8c;font-size:13px"> · alta nueva</span>
    </div>
    <div style="padding:8px 22px 20px">
      <h1 style="margin:16px 0 14px;font-size:18px;color:#1b1712">Se ha registrado un cliente nuevo</h1>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #eee;border-radius:10px;overflow:hidden">
        {rows_html}
      </table>
      <p style="margin:16px 0 0;color:#6a635c;font-size:13px">Puedes responder a este correo para contactar directamente con el cliente.</p>
    </div>
  </div>
</div>"""
    return send_mail_safe(subject, body, to, html=html, reply_to=(user.email or None))


def send_admin_plan_change(restaurant, requested_plan_display, user):
    """Aviso interno al admin de una solicitud de cambio de plan."""
    to = getattr(settings, 'ADMIN_NOTIFY_EMAIL', None)
    subject = f'[{BRAND}] Solicitud de plan: {restaurant.name} → {requested_plan_display}'
    body = (
        f'Solicitud de cambio de plan en {BRAND}.\n\n'
        f'Restaurante: {restaurant.name}\n'
        f'Plan actual: {restaurant.get_plan_display()}\n'
        f'Plan solicitado: {requested_plan_display}\n'
        f'Solicitado por: {(user.get_full_name() or user.username) if user else "—"}\n'
        f'Correo: {(user.email or user.username) if user else "—"}\n'
    )
    return send_mail_safe(subject, body, to, reply_to=((user.email if user else None) or None))


def send_password_reset(user, temp_password, to_email):
    """Envía una contraseña TEMPORAL para volver a entrar (se cambia al iniciar
    sesión). Mismo mecanismo que el reset de admin/owner."""
    name = _display_name(user)
    login_url = getattr(settings, 'FRONTEND_BASE_URL', '')
    subject = f'Tu contraseña temporal de {BRAND}'
    body = (
        f'Hola {name},\n\n'
        f'Generamos una contraseña temporal para que vuelvas a entrar:\n\n'
        f'    {temp_password}\n\n'
        f'Entra con ella en {login_url} y te pediremos que elijas una nueva.\n'
        f'Si no fuiste tú, avísanos respondiendo a este correo.\n\n'
        f'— El equipo de {BRAND}'
    )
    html = _wrap_html(
        'Tu contraseña temporal',
        f'<p style="color:#3a352e;line-height:1.55">Hola {name}, generamos una contraseña temporal '
        f'para que vuelvas a entrar. Al iniciar sesión te pediremos que elijas una nueva.</p>'
        f'<p style="margin:18px 0;text-align:center">'
        f'<span style="display:inline-block;background:#17130f;color:#ff9a3d;font-family:monospace;'
        f'font-size:20px;letter-spacing:2px;padding:12px 22px;border-radius:10px">{temp_password}</span></p>'
        f'<p style="margin:20px 0"><a href="{login_url}" '
        f'style="background:#e8531f;color:#fff;text-decoration:none;padding:11px 20px;border-radius:9px;'
        f'font-weight:600;display:inline-block">Entrar a {BRAND}</a></p>'
        f'<p style="color:#6a635c;font-size:13px">Si no fuiste tú, avísanos respondiendo a este correo.</p>',
    )
    return send_mail_safe(subject, body, to_email, html=html)
