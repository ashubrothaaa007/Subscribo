from odoo import _, api, fields, models
from odoo.exceptions import UserError


class SubscriptionRenewalWizard(models.TransientModel):
    _name = 'subscribo.renewal.wizard'
    _description = 'Renew a SUBSCRIBO Subscription'

    subscription_id = fields.Many2one('subscribo.subscription', required=True, readonly=True)
    start_date = fields.Date(required=True)
    expiry_date = fields.Date(required=True)

    @api.model
    def default_get(self, field_list):
        values = super().default_get(field_list)
        subscription = self.env['subscribo.subscription'].browse(
            self.env.context.get('default_subscription_id')
        ).exists()
        if subscription:
            values.setdefault('subscription_id', subscription.id)
            values.setdefault('start_date', fields.Date.add(subscription.expiry_date, days=1))
        return values

    def action_create_renewal(self):
        self.ensure_one()
        if not (
            self.env.user.has_group('subscribo.group_subscribo_admin')
            or self.env.user.has_group('subscribo.group_subscribo_staff')
        ):
            raise UserError(_('Only SUBSCRIBO Admin or Staff can create renewal quotations in the backend.'))
        return self.subscription_id.action_renew(self.start_date, self.expiry_date)
