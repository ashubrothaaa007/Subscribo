from odoo import Command, SUPERUSER_ID, _, api, fields, models
from odoo.exceptions import AccessError, UserError, ValidationError
from odoo.tools import email_normalize
from psycopg2 import IntegrityError


class ResUsers(models.Model):
    _inherit = 'res.users'

    subscribo_email_key = fields.Char(
        compute='_compute_subscribo_email_key', store=True, index=True,
        copy=False, groups='base.group_system',
    )

    _subscribo_email_key_unique = models.Constraint(
        'UNIQUE(subscribo_email_key)',
        'An account already uses this normalized email address.',
    )

    @api.depends('email', 'login')
    def _compute_subscribo_email_key(self):
        for user in self:
            # Account email is authoritative; email-shaped logins cover standard
            # account creation paths where Odoo leaves res.users.email empty.
            address = user.email or (user.login if '@' in (user.login or '') else '')
            user.subscribo_email_key = self._subscribo_normalize_email(address) or False

    @staticmethod
    def _subscribo_normalize_email(email):
        normalized = email_normalize(email or '', strict=True)
        return normalized.casefold() if normalized else False

    @staticmethod
    def _subscribo_validate_password(password):
        """Validate the required policy against Odoo's effective password."""
        value = (password or '').strip()
        if len(value) <= 8:
            raise ValidationError(_('Password must contain more than eight characters.'))
        if not any(char.isupper() for char in value):
            raise ValidationError(_('Password must contain an uppercase letter.'))
        if not any(char.islower() for char in value):
            raise ValidationError(_('Password must contain a lowercase letter.'))
        if not any(not char.isalnum() and not char.isspace() for char in value):
            raise ValidationError(_('Password must contain a special character.'))
        return value

    def _subscribo_is_admin(self):
        return (
            self.env.uid == SUPERUSER_ID
            or self.env.user.has_group('subscribo.group_subscribo_admin')
        )

    @api.model
    def _subscribo_role_group_ids(self):
        return {
            group.id
            for xmlid in (
                'subscribo.group_subscribo_admin',
                'subscribo.group_subscribo_staff',
                'subscribo.group_subscribo_customer',
            )
            if (group := self.env.ref(xmlid, raise_if_not_found=False))
        }

    def _subscribo_group_role_change_requested(self, values):
        """Return true only when group_ids changes a SUBSCRIBO role.

        Ordinary Odoo group operations remain governed by Odoo's own ACLs.
        This guard adds an app-specific boundary around the three SUBSCRIBO
        groups without blocking unrelated user creation or role edits.
        """
        commands = values.get('group_ids')
        if not commands:
            return False

        subscribo_groups = self._subscribo_role_group_ids()
        if not subscribo_groups:
            return False

        current_roles = {
            user.id: set(user.group_ids.ids) & subscribo_groups
            for user in self
        }
        if not self:
            current_roles = {False: set()}

        for command in commands:
            operation = command[0]
            if operation == Command.LINK and command[1] in subscribo_groups:
                if any(command[1] not in roles for roles in current_roles.values()):
                    return True
            elif operation == Command.UNLINK and command[1] in subscribo_groups:
                if any(command[1] in roles for roles in current_roles.values()):
                    return True
            elif operation == Command.CLEAR:
                if any(current_roles.values()):
                    return True
            elif operation == Command.SET:
                requested_roles = set(command[2]) & subscribo_groups
                if any(roles != requested_roles for roles in current_roles.values()):
                    return True
        return False

    @api.model
    def _subscribo_values_assign_role(self, values):
        role_ids = self._subscribo_role_group_ids()
        for command in values.get('group_ids') or []:
            if command[0] == Command.LINK and command[1] in role_ids:
                return True
            if command[0] == Command.SET and set(command[2]) & role_ids:
                return True
        return False

    @api.model
    def _subscribo_users_have_role(self, users):
        role_ids = self._subscribo_role_group_ids()
        return bool(role_ids & set(users.sudo().mapped('all_group_ids').ids))

    @api.model
    def _subscribo_reset_token_partner(self, token):
        if not token:
            return self.env['res.partner']
        try:
            return self.env['res.partner'].sudo()._signup_retrieve_partner(
                token, check_validity=True, raise_exception=False
            )
        except UserError:
            return self.env['res.partner']

    @api.model
    def _subscribo_reset_token_has_role(self, token):
        partner = self._subscribo_reset_token_partner(token)
        return bool(partner and self._subscribo_users_have_role(partner.user_ids))

    def _subscribo_is_internal_customer_assignment(self, values):
        """Allow only the controller's trusted sudo path to add Customer."""
        if not (
            self.env.su
            and self.env.context.get('_subscribo_internal_customer_assignment')
            and values.get('group_ids')
        ):
            return False
        customer = self.env.ref('subscribo.group_subscribo_customer', raise_if_not_found=False)
        if not customer:
            return False
        commands = values['group_ids']
        return bool(commands) and all(
            command[0] == Command.LINK and command[1] == customer.id
            for command in commands
        )

    @api.model
    def _subscribo_check_email_available(self, email, exclude_ids=None):
        email_key = self._subscribo_normalize_email(email)
        if not email_key:
            raise ValidationError(_('Enter a valid email address.'))

        domain = [('subscribo_email_key', '=', email_key)]
        users = self.sudo().with_context(active_test=False).search(domain)
        if exclude_ids:
            users = users.filtered(lambda user: user.id not in exclude_ids)
        if users:
            raise ValidationError(_('This email address is already registered.'))
        return email_key

    @api.model
    def _get_signup_invitation_scope(self):
        if self.env.context.get('subscribo_public_signup'):
            return 'b2c'
        return super()._get_signup_invitation_scope()

    @api.model_create_multi
    def create(self, vals_list):
        vals_list = [dict(values) for values in vals_list]
        for values in vals_list:
            if self._subscribo_group_role_change_requested(values) and not self._subscribo_is_admin():
                raise AccessError(_('Only a SUBSCRIBO administrator can assign SUBSCRIBO roles.'))
            if values.get('password') and (
                self.env.context.get('subscribo_public_signup')
                or self._subscribo_values_assign_role(values)
            ):
                values['password'] = self._subscribo_validate_password(values['password'])
            email = values.get('email')
            if email:
                values['email'] = self._subscribo_check_email_available(email)
        try:
            with self.env.cr.savepoint():
                return super().create(vals_list)
        except IntegrityError as error:
            if getattr(error.diag, 'constraint_name', None) == 'res_users_subscribo_email_key_unique':
                raise ValidationError(_('This email address is already registered.')) from error
            raise

    def write(self, values):
        values = dict(values)
        if self._subscribo_group_role_change_requested(values) and not self._subscribo_is_admin():
            if not self._subscribo_is_internal_customer_assignment(values):
                raise AccessError(_('Only a SUBSCRIBO administrator can change SUBSCRIBO roles.'))
        if (
            values.get('role') == 'group_system'
            and not self._subscribo_is_admin()
            and (
                self.env.user.has_group('subscribo.group_subscribo_staff')
                or self.env.user.has_group('subscribo.group_subscribo_customer')
            )
        ):
            raise AccessError(_('SUBSCRIBO Staff and Customers cannot promote users to Administrator.'))
        if values.get('password') and (
            self._subscribo_users_have_role(self)
            or self._subscribo_values_assign_role(values)
            or self.env.context.get('subscribo_public_signup')
        ):
            values['password'] = self._subscribo_validate_password(values['password'])
        if 'email' in values and values.get('email'):
            values['email'] = self._subscribo_check_email_available(
                values['email'], exclude_ids=set(self.ids)
            )
        elif 'email' in values and not values.get('email'):
            # Preserve the normalized login key for login-only accounts.
            pass
        try:
            with self.env.cr.savepoint():
                return super().write(values)
        except IntegrityError as error:
            if getattr(error.diag, 'constraint_name', None) == 'res_users_subscribo_email_key_unique':
                raise ValidationError(_('This email address is already registered.')) from error
            raise

    @api.model
    def signup(self, values, token=None):
        values = dict(values)
        if values.get('password') and (
            self.env.context.get('subscribo_public_signup')
            or self._subscribo_reset_token_has_role(token)
        ):
            values['password'] = self._subscribo_validate_password(values['password'])

        if not token:
            email = values.get('email') or values.get('login')
            email_key = self._subscribo_check_email_available(email)
            # Odoo's login has a database UNIQUE constraint. Canonicalizing the
            # email-backed customer login also makes concurrent duplicate
            # signup attempts collide on that constraint.
            values['login'] = email_key
            values['email'] = email_key
        elif values.get('email') and self.env.context.get('subscribo_public_signup'):
            partner = self._subscribo_reset_token_partner(token)
            if partner:
                values['email'] = self._subscribo_check_email_available(
                    values['email'], exclude_ids=set(partner.user_ids.ids)
                )
        return super().signup(values, token=token)

    @api.model
    def _signup_create_user(self, values):
        values = dict(values)
        if values.get('password') and (
            self.env.context.get('subscribo_public_signup')
            or self._subscribo_values_assign_role(values)
        ):
            values['password'] = self._subscribo_validate_password(values['password'])

        if not values.get('partner_id'):
            email = values.get('email') or values.get('login')
            email_key = self._subscribo_check_email_available(email)
            values['email'] = email_key
            values['login'] = email_key

        user = super()._signup_create_user(values)
        if user and not values.get('partner_id') and self.env.context.get('subscribo_public_signup'):
            customer_group = self.env.ref('subscribo.group_subscribo_customer')
            user.sudo().with_context(
                _subscribo_internal_customer_assignment=True
            ).write({'group_ids': [(4, customer_group.id)]})
        return user

    def _change_password(self, new_passwd):
        if self._subscribo_users_have_role(self):
            new_passwd = self._subscribo_validate_password(new_passwd)
        validated = new_passwd
        return super()._change_password(validated)
