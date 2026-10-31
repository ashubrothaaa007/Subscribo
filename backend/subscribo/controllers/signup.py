from urllib.parse import urlencode

from odoo import http, _
from odoo.addons.auth_signup.controllers.main import AuthSignupHome
from odoo.addons.auth_signup.models.res_users import SignupError
from odoo.exceptions import UserError
from odoo.http import request
from odoo.addons.web.controllers.home import SIGN_UP_REQUEST_PARAMS



class SubscriboSignupController(AuthSignupHome):
    """Public customer registration scoped to SUBSCRIBO's own route."""

    @http.route(
        '/subscribo/signup', type='http', auth='public',
        methods=['GET', 'POST'], website=True, sitemap=False,
    )
    def subscribo_signup(self, **kwargs):
        qcontext = {key: value for key, value in request.params.items() if key in SIGN_UP_REQUEST_PARAMS}
        qcontext.update({
            'signup_enabled': True,
            'reset_password_enabled': request.env['ir.config_parameter'].sudo().get_param(
                'auth_signup.reset_password'
            ) == 'True',
        })
        if qcontext.get('token'):
            qcontext.update(request.env['res.partner'].sudo()._signup_retrieve_info(qcontext['token']) or {})
        if 'error' not in qcontext and request.httprequest.method == 'POST':
            try:
                values = self._prepare_signup_values(qcontext)
                request.env['res.users'].sudo().with_context(
                    subscribo_public_signup=True
                ).signup(values, qcontext.get('token'))
                request.env.cr.commit()
                return request.redirect('/web/login?%s' % urlencode({
                    'login': qcontext.get('login'),
                }))
            except (UserError, SignupError) as error:
                qcontext['error'] = error.args[0]
            except (AssertionError, ValueError) as error:
                qcontext['error'] = str(error)

        response = request.render('auth_signup.signup', qcontext)
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['Content-Security-Policy'] = "frame-ancestors 'self'"
        return response
