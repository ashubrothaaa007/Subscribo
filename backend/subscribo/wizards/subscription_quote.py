from odoo import Command, _, fields, models
from odoo.exceptions import UserError, ValidationError


class SubscriptionQuoteWizard(models.TransientModel):
    _name = 'subscribo.quote.wizard'
    _description = 'Create a SUBSCRIBO Quotation'

    partner_id = fields.Many2one('res.partner', required=True, string='Customer', check_company=True)
    plan_id = fields.Many2one(
        'subscribo.plan', required=True, string='Subscription Plan',
        domain=[('active', '=', True)], ondelete='restrict',
    )
    quantity = fields.Float(required=True, default=1.0, digits='Product Unit of Measure')
    template_id = fields.Many2one(
        'sale.order.template', string='Quotation Template', required=True, check_company=True,
        domain="['|', ('company_id', '=', False), ('company_id', '=', company_id)]",
    )
    company_id = fields.Many2one('res.company', required=True, default=lambda self: self.env.company)
    start_date = fields.Date(required=True, default=fields.Date.context_today)
    expiry_date = fields.Date(required=True)

    def action_create_quotation(self):
        self.ensure_one()
        if not (
            self.env.user.has_group('subscribo.group_subscribo_admin')
            or self.env.user.has_group('subscribo.group_subscribo_staff')
        ):
            raise UserError(_('Only SUBSCRIBO Admin or Staff can prepare a quotation.'))
        self.plan_id.validate_request(self.quantity, self.start_date)
        if not self.plan_id.service_product_id:
            raise ValidationError(_('Set a plan service product before quoting this plan.'))
        if self.expiry_date < self.start_date:
            raise ValidationError(_('Subscription expiry date must be on or after its start date.'))
        if self.template_id and self.template_id.subscribo_plan_id and self.template_id.subscribo_plan_id != self.plan_id:
            raise ValidationError(_('The selected plan does not match the quotation template plan.'))
        if self.template_id and self.template_id.subscribo_plan_id != self.plan_id:
            raise ValidationError(_('Configure the selected plan on the quotation template before using it.'))
        if self.template_id.number_of_days <= 0:
            raise ValidationError(_('The quotation template must define a positive validity duration.'))
        if self.template_id and self.plan_id.service_product_id in self.template_id.sale_order_template_line_ids.product_id:
            raise ValidationError(_('The plan service product must not be duplicated in quotation template lines.'))

        company = self.company_id
        line_values = []
        if self.template_id:
            for template_line in self.template_id.sale_order_template_line_ids.sorted('sequence'):
                line_values.append(template_line._prepare_order_line_values())

        order = self.env['sale.order'].create({
            'partner_id': self.partner_id.id,
            'company_id': company.id,
            'sale_order_template_id': self.template_id.id,
            'subscribo_is_subscription': True,
            'subscribo_plan_id': self.plan_id.id,
            'subscribo_quantity': self.quantity,
            'subscribo_start_date': self.start_date,
            'subscribo_expiry_date': self.expiry_date,
            'require_signature': True,
            'require_payment': False,
            'order_line': [Command.create(values) for values in line_values],
        })
        return {
            'type': 'ir.actions.act_window',
            'name': _('SUBSCRIBO Quotation'),
            'res_model': 'sale.order',
            'view_mode': 'form',
            'res_id': order.id,
            'target': 'current',
        }
