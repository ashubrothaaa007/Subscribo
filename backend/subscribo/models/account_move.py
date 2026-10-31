from odoo import fields, models


class AccountMove(models.Model):
    _inherit = 'account.move'

    subscribo_subscription_id = fields.Many2one(
        'subscribo.subscription',
        string='Source Subscription',
        ondelete='restrict',
        index=True,
        copy=False,
    )
    subscribo_billing_start = fields.Date(
        string='Subscription Period Start',
        copy=False,
    )
    subscribo_billing_end = fields.Date(
        string='Subscription Period End',
        copy=False,
    )
    subscribo_is_recurring = fields.Boolean(
        string='SUBSCRIBO Recurring Invoice',
        default=False,
        index=True,
    )

