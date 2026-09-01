"""Correos transaccionales de RecipeForge.

Todo el envío pasa por `send_mail_safe`, que NUNCA lanza: si el correo no está
configurado (sin credenciales) o el envío falla, se registra y se sigue. Así una
alta o un reset jamás se rompen por un problema de correo.
"""
import json
import logging
import threading
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

BRAND = 'RecipeForge'

RESEND_ENDPOINT = 'https://api.resend.com/emails'


def _resend_api_send(recipients, subject, body, html, reply_to):
    """Envía por la API HTTP de Resend (puerto 443). Funciona en Render, que
    bloquea el SMTP saliente. Lanza si la respuesta no es 2xx."""
    key = getattr(settings, 'RESEND_API_KEY', '')
    payload = {
        'from': getattr(settings, 'DEFAULT_FROM_EMAIL', 'RecipeForge <info@recipeforge.es>'),
        'to': recipients,
        'subject': subject,
        'text': body,
    }
    if html:
        payload['html'] = html
    if reply_to:
        payload['reply_to'] = reply_to
    req = urllib.request.Request(
        RESEND_ENDPOINT,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            # User-Agent propio: el de urllib por defecto lo bloquea el Cloudflare
            # de Resend (error 1010).
            'User-Agent': f'{BRAND}/1.0 (+https://recipeforge.es)',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return 200 <= resp.status < 300


def _deliver(subject, body, recipients, html, reply_to):
    """Entrega real: API HTTP de Resend si hay key, si no el backend de Django."""
    if getattr(settings, 'RESEND_API_KEY', ''):
        return _resend_api_send(recipients, subject, body, html, reply_to)
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


def send_mail_safe(subject, body, to, html=None, reply_to=None):
    """Envía un correo sin bloquear NUNCA la petición: la entrega va en un hilo
    aparte (Resend por HTTP puede tardar unos segundos desde Render). Nunca lanza.
    Devuelve True si se encoló. Con RESEND_API_KEY usa la API HTTP de Resend; si no,
    el backend de Django (consola en DEBUG, dummy en prod)."""
    if not to:
        return False
    recipients = [to] if isinstance(to, str) else list(to)

    def _worker():
        try:
            _deliver(subject, body, recipients, html, reply_to)
        except Exception:
            logger.warning('No se pudo enviar el correo "%s" a %s', subject, recipients, exc_info=True)

    threading.Thread(target=_worker, name='rf-email', daemon=True).start()
    return True


LOGO_URL = 'https://recipeforge.es/logo-email.png'
TAGLINE = 'Fichas técnicas, escandallo y carta QR para tu restaurante'


def _shell(title, inner_html, kicker='', preheader=''):
    """Envoltura de correo: logo de RecipeForge + tarjeta 'glass' (translúcida,
    con filo y sombra suave) sobre un fondo cálido de forja. Table-based para
    máxima compatibilidad; sin blur real (los clientes de correo no lo admiten),
    el efecto glass se logra con translucidez, filo claro y sombras."""
    kicker_html = (
        f'<p style="margin:0 0 10px;font-size:11.5px;letter-spacing:2px;'
        f'text-transform:uppercase;color:#e8531f;font-weight:700">{kicker}</p>'
    ) if kicker else ''
    return f"""\
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">{preheader}</div>
<div style="margin:0;padding:30px 16px;background:#160f0a;background:linear-gradient(158deg,#2a1810 0%,#3c2313 50%,#150e09 100%);font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="border-radius:22px;overflow:hidden;background:rgba(255,255,255,0.97);border:1px solid rgba(255,255,255,0.55);box-shadow:0 32px 74px -26px rgba(0,0,0,.78),0 0 62px -18px rgba(255,120,40,.42)">
        <div style="background:#14100c;background:linear-gradient(135deg,#211913 0%,#0e0b08 100%);padding:26px 28px 22px;text-align:center">
          <img src="{LOGO_URL}" alt="{BRAND}" width="196" style="display:inline-block;width:196px;max-width:72%;height:auto;border:0" />
          <div style="height:3px;width:66px;margin:16px auto 0;border-radius:3px;background:linear-gradient(90deg,#ff9a3d,#e8531f)"></div>
        </div>
        <div style="padding:28px 30px 8px">
          {kicker_html}
          <h1 style="margin:0 0 14px;font-size:23px;line-height:1.22;color:#1b1712;font-weight:800">{title}</h1>
          {inner_html}
        </div>
        <div style="padding:14px 30px 26px">
          <div style="border-top:1px solid #efe8df;padding-top:14px;color:#a49b8f;font-size:12px;line-height:1.5">
            {BRAND} · {TAGLINE}.<br>¿Dudas? Responde a este correo y te ayudamos.
          </div>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
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
        f'<tr><td style="padding:8px 0;color:#3a352e;font-size:14.5px;line-height:1.45;vertical-align:top">'
        f'<span style="display:inline-block;width:20px;color:#e8531f;font-weight:700">✦</span>{txt}</td></tr>'
    )
    inner = (
        f'<p style="margin:0 0 6px;color:#3a352e;font-size:15px;line-height:1.6">'
        f'Tu cuenta para <strong>{restaurant.name}</strong> está lista. {trial_line}</p>'
        f'<p style="margin:18px 0 6px;color:#8a7f72;font-size:11.5px;text-transform:uppercase;letter-spacing:1px;font-weight:700">Todo lo que puedes hacer</p>'
        f'<table role="presentation" cellpadding="0" cellspacing="0" width="100%">'
        f'{feature("Estandariza tus <strong>fichas técnicas</strong> e imprímelas en A4.")}'
        f'{feature("Calcula <strong>escandallos</strong>, food cost y márgenes.")}'
        f'{feature("Lleva <strong>inventario</strong> y <strong>proveedores</strong>.")}'
        f'{feature("Publica tu <strong>carta digital con QR</strong>.")}'
        f'</table>'
        f'{_email_btn(login_url, "Entrar a mi cocina →")}'
        f'<p style="margin:4px 0 0;color:#9a9186;font-size:12px">Si el botón no funciona: '
        f'<a href="{login_url}" style="color:#b0552b">{login_url}</a></p>'
    )
    html = _shell(f'¡Bienvenido, {name}!', inner, kicker='Tu cocina está en marcha',
                  preheader=f'{restaurant.name} ya está en marcha en {BRAND}.')
    return send_mail_safe(subject, body, user.email, html=html)


def send_verification_email(user, verify_url):
    """Enlace para verificar el correo tras el alta autoservicio."""
    name = _display_name(user)
    subject = f'Verifica tu cuenta de {BRAND}'
    body = (
        f'Hola {name},\n\n'
        f'Gracias por crear tu cuenta en {BRAND}. Para activarla y poder entrar,'
        f' confirma tu correo aquí:\n{verify_url}\n\n'
        f'Si no fuiste tú, ignora este mensaje.\n\n'
        f'— El equipo de {BRAND}'
    )
    inner = (
        f'<p style="margin:0;color:#3a352e;font-size:15px;line-height:1.6">Hola {name}, gracias por crear tu cuenta en '
        f'<strong>{BRAND}</strong>. Confirma tu correo para activarla y entrar a tu cocina:</p>'
        f'{_email_btn(verify_url, "Verificar mi cuenta →")}'
        f'<p style="margin:0;color:#9a9186;font-size:12px">Si el botón no funciona:<br>'
        f'<a href="{verify_url}" style="color:#b0552b;word-break:break-all">{verify_url}</a></p>'
        f'<p style="margin:14px 0 0;color:#b0a99e;font-size:12px">Si no fuiste tú, ignora este mensaje.</p>'
    )
    html = _shell('Verifica tu cuenta', inner, kicker='Un último paso',
                  preheader=f'Confirma tu correo para activar tu cuenta de {BRAND}.')
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
    inner = (
        f'<p style="margin:0 0 14px;color:#3a352e;font-size:14.5px">Se ha registrado un cliente nuevo. Sus datos:</p>'
        f'<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #eee;border-radius:12px;overflow:hidden">'
        f'{rows_html}</table>'
        f'<p style="margin:16px 0 0;color:#6a635c;font-size:13px">Responde a este correo para contactar directamente con el cliente.</p>'
    )
    html = _shell(f'Alta nueva · {plan}', inner, kicker='Panel de administración',
                  preheader=f'{restaurant.name} ({tipo}) se ha registrado.')
    return send_mail_safe(subject, body, to, html=html, reply_to=(user.email or None))


def send_admin_plan_change(restaurant, requested_plan_display, user):
    """Aviso interno al admin de una solicitud de cambio de plan."""
    to = getattr(settings, 'ADMIN_NOTIFY_EMAIL', None)
    who = (user.get_full_name() or user.username) if user else '—'
    who_email = (user.email or user.username) if user else '—'
    subject = f'[{BRAND}] Solicitud de plan: {restaurant.name} → {requested_plan_display}'
    body = (
        f'Solicitud de cambio de plan en {BRAND}.\n\n'
        f'Restaurante: {restaurant.name}\n'
        f'Plan actual: {restaurant.get_plan_display()}\n'
        f'Plan solicitado: {requested_plan_display}\n'
        f'Solicitado por: {who}\n'
        f'Correo: {who_email}\n'
    )

    def _row(k, v, accent=False):
        vstyle = 'color:#e8531f;font-weight:700' if accent else 'color:#1b1712;font-weight:600'
        return (
            f'<tr><td style="padding:9px 14px;border-bottom:1px solid #eee;color:#8a837a;font-size:13px;white-space:nowrap">{k}</td>'
            f'<td style="padding:9px 14px;border-bottom:1px solid #eee;{vstyle};font-size:14px">{v}</td></tr>'
        )
    correo_link = f"<a href='mailto:{who_email}' style='color:#b0552b'>{who_email}</a>"
    inner = (
        f'<p style="margin:0 0 14px;color:#3a352e;font-size:14.5px">Un cliente solicita cambiar de plan:</p>'
        f'<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #eee;border-radius:12px;overflow:hidden">'
        f'{_row("Restaurante", restaurant.name)}'
        f'{_row("Plan actual", restaurant.get_plan_display())}'
        f'{_row("Plan solicitado", requested_plan_display, accent=True)}'
        f'{_row("Solicitado por", who)}'
        f'{_row("Correo", correo_link)}'
        f'</table>'
        f'<p style="margin:16px 0 0;color:#6a635c;font-size:13px">Aplícalo desde el panel de administración cuando lo confirmes.</p>'
    )
    html = _shell(f'Solicitud de plan · {requested_plan_display}', inner, kicker='Panel de administración',
                  preheader=f'{restaurant.name} pide pasar a {requested_plan_display}.')
    return send_mail_safe(subject, body, to, html=html, reply_to=((user.email if user else None) or None))


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
    inner = (
        f'<p style="margin:0;color:#3a352e;font-size:15px;line-height:1.6">Hola {name}, generamos una contraseña temporal '
        f'para que vuelvas a entrar. Al iniciar sesión te pediremos que elijas una nueva.</p>'
        f'<div style="margin:20px 0;text-align:center">'
        f'<span style="display:inline-block;background:#17130f;color:#ff9a3d;font-family:Consolas,Menlo,monospace;'
        f'font-size:21px;letter-spacing:3px;padding:13px 26px;border-radius:12px;box-shadow:0 10px 26px -12px rgba(232,83,31,.7)">{temp_password}</span></div>'
        f'{_email_btn(login_url, "Entrar ahora →")}'
        f'<p style="margin:4px 0 0;color:#b0a99e;font-size:12px">Si no fuiste tú, avísanos respondiendo a este correo.</p>'
    )
    html = _shell('Tu contraseña temporal', inner, kicker='Recuperar acceso',
                  preheader='Tu contraseña temporal para volver a entrar.')
    return send_mail_safe(subject, body, to_email, html=html)
