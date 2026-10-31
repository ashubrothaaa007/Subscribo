from odoo import _, http
from odoo.exceptions import AccessError, MissingError, UserError, ValidationError
from odoo.http import request
from odoo.addons.sale.controllers.portal import CustomerPortal


class SubscriboCustomerPortal(CustomerPortal):

    def _subscribo_customer_subscription(self, subscription_id):
        subscription = request.env['subscribo.subscription'].browse(subscription_id).exists()
        if not subscription:
            raise MissingError(_('Subscription not found.'))
        subscription.check_access('read')
        # The record rule has already authorized this record. Elevation is used
        # only to render fields that are intentionally hidden from customer ORM access.
        return subscription.sudo()

    def _subscribo_customer_quote(self, order_id):
        order = request.env['sale.order'].sudo().browse(order_id).exists()
        if not order or not order.subscribo_is_subscription:
            return None
        if request.env.user._is_public() or not request.env.user.has_group('subscribo.group_subscribo_customer'):
            raise AccessError(_('Sign in as the SUBSCRIBO customer to access this quotation.'))
        if order.partner_id.commercial_partner_id != request.env.user.partner_id.commercial_partner_id:
            raise AccessError(_('You can only access your own SUBSCRIBO quotations.'))
        return order

    @http.route()
    def portal_order_page(self, order_id, **kw):
        try:
            self._subscribo_customer_quote(order_id)
        except (AccessError, MissingError):
            return request.redirect('/my')
        return super().portal_order_page(order_id, **kw)

    @http.route()
    def portal_quote_accept(self, order_id, access_token=None, name=None, signature=None):
        try:
            order = self._subscribo_customer_quote(order_id)
        except (AccessError, MissingError):
            return {'error': _('Invalid order.')}
        if order and order.state == 'draft':
            # Odoo permits a signature on a draft quotation. Record the
            # quotation lifecycle step before its normal validation/confirmation.
            order.action_quotation_sent()
        return super().portal_quote_accept(
            order_id, access_token=access_token, name=name, signature=signature
        )

    @http.route('/my/subscriptions', type='http', auth='user', website=True, methods=['GET'])
    def subscribo_my_subscriptions(self, **kwargs):
        if not request.env.user.has_group('subscribo.group_subscribo_customer'):
            return request.redirect('/my')
        subscriptions = request.env['subscribo.subscription'].search([], order='id desc')
        return request.render('subscribo.portal_my_subscriptions', {'subscriptions': subscriptions.sudo()})

    @http.route('/my/subscriptions/<int:subscription_id>', type='http', auth='user', website=True, methods=['GET'])
    def subscribo_subscription_page(self, subscription_id, **kwargs):
        try:
            subscription = self._subscribo_customer_subscription(subscription_id)
        except (AccessError, MissingError):
            return request.redirect('/my/subscriptions')
        return request.render('subscribo.portal_subscription_page', {'subscription': subscription})

    @http.route('/my/subscriptions/<int:subscription_id>/action/<string:operation>', type='http', auth='user', website=True, methods=['POST'])
    def subscribo_subscription_action(self, subscription_id, operation, **post):
        try:
            subscription = self._subscribo_customer_subscription(subscription_id)
            if operation == 'pause':
                subscription.action_pause(post.get('reason'))
            elif operation == 'resume':
                subscription.action_resume(post.get('reason'))
            elif operation == 'close':
                subscription.action_close(post.get('reason'))
            elif operation == 'addon_enable':
                addon = request.env['subscribo.subscription.addon'].browse(int(post.get('addon_id', 0))).exists()
                addon.check_access('read')
                if addon.subscription_id.id != subscription.id:
                    raise AccessError(_('This add-on does not belong to your subscription.'))
                change_order = addon.action_request_enable()
                return request.redirect(change_order.get_portal_url())
            elif operation == 'addon_disable':
                addon = request.env['subscribo.subscription.addon'].browse(int(post.get('addon_id', 0))).exists()
                addon.check_access('read')
                if addon.subscription_id.id != subscription.id:
                    raise AccessError(_('This add-on does not belong to your subscription.'))
                addon.action_disable(post.get('reason'))
            elif operation == 'renew':
                action = subscription.action_renew(post.get('start_date'), post.get('expiry_date'))
                order = request.env['sale.order'].sudo().browse(action['res_id'])
                return request.redirect(order.get_portal_url())
            else:
                raise ValidationError(_('Unknown subscription operation.'))
        except (AccessError, MissingError, UserError, ValidationError, ValueError):
            return request.redirect('/my/subscriptions')
        return request.redirect(f'/my/subscriptions/{subscription_id}')
