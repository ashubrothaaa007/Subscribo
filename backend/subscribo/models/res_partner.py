from odoo import _, models
from odoo.exceptions import ValidationError
from psycopg2 import IntegrityError


class ResPartner(models.Model):
    _inherit = 'res.partner'

    def write(self, values):
        values = dict(values)
        if 'email' in values:
            if values.get('email'):
                email_key = self.env['res.users']._subscribo_normalize_email(values['email'])
                if not email_key:
                    raise ValidationError(_('Enter a valid email address.'))
                values['email'] = email_key
            account_users = self.env['res.users'].sudo().search([('partner_id', 'in', self.ids)])
            if account_users:
                if not values.get('email'):
                    raise ValidationError(_('An account email address cannot be removed.'))
                if len(account_users) > 1:
                    raise ValidationError(_('Change one linked account email at a time.'))
                email_key = self.env['res.users']._subscribo_check_email_available(
                    values['email'], exclude_ids={account_users.id}
                )
                values['email'] = email_key
        try:
            with self.env.cr.savepoint():
                return super().write(values)
        except IntegrityError as error:
            if getattr(error.diag, 'constraint_name', None) == 'res_users_subscribo_email_key_unique':
                raise ValidationError(_('This email address is already registered.')) from error
            raise
