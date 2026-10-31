from odoo import fields, models


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    subscribo_notes = fields.Text(
        string='SUBSCRIBO Notes',
        groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff',
        help='Internal notes for the SUBSCRIBO product catalog.',
    )
