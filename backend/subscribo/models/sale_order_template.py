from odoo import fields, models


class SaleOrderTemplate(models.Model):
    _inherit = 'sale.order.template'

    subscribo_plan_id = fields.Many2one(
        'subscribo.plan',
        string='SUBSCRIBO Plan',
        ondelete='restrict',
        check_company=True,
        domain=[('active', '=', True)],
    )
