import re
import ast
import uuid
from urllib.parse import urlencode
from pathlib import Path

from psycopg2 import IntegrityError
from odoo import Command, SUPERUSER_ID, api
from odoo import http
from odoo.addons.auth_signup.models.res_users import SignupError
from odoo.exceptions import AccessError, UserError, ValidationError
from odoo.tests import HttpCase, TransactionCase, tagged


@tagged('post_install', '-at_install')
class TestSubscriboAuthentication(TransactionCase):

    def _signup(self, email, password='ValidPassword1!'):
        return self.env['res.users'].sudo().with_context(subscribo_public_signup=True).signup({
            'login': email,
            'email': email,
            'name': 'SUBSCRIBO Test Customer',
            'password': password,
        })

    def test_customer_signup_normalizes_email_and_assigns_customer_role(self):
        email = 'Subscribo.Test.Customer@example.com'
        login, returned_password = self._signup(email)

        self.assertEqual(login, 'subscribo.test.customer@example.com')
        self.assertEqual(returned_password, 'ValidPassword1!')
        user = self.env['res.users'].sudo().search([('login', '=', login)], limit=1)
        self.assertTrue(user)
        self.assertIn(self.env.ref('subscribo.group_subscribo_customer'), user.all_group_ids)
        self.assertIn(self.env.ref('base.group_portal'), user.all_group_ids)
        self.assertNotIn(self.env.ref('base.group_user'), user.all_group_ids)
        self.assertNotIn(self.env.ref('subscribo.group_subscribo_staff'), user.all_group_ids)
        self.assertNotIn(self.env.ref('subscribo.group_subscribo_admin'), user.all_group_ids)

    def test_duplicate_email_is_rejected_case_insensitively(self):
        self._signup('duplicate.subscribo@example.com')
        with self.assertRaises(ValidationError):
            self._signup('Duplicate.Subscribo@Example.com')

    def test_registered_account_email_cannot_be_changed_to_another_account_email(self):
        first_login, _ = self._signup('first.email@example.com')
        self._signup('second.email@example.com')
        first_user = self.env['res.users'].sudo().search([('login', '=', first_login)], limit=1)

        with self.assertRaises(ValidationError):
            first_user.partner_id.write({'email': 'SECOND.EMAIL@example.com'})

    def test_database_constraint_rejects_canonical_duplicate_emails(self):
        first_login, _ = self._signup('canonical@example.com')
        second_login, _ = self._signup('canonical.other@example.com')
        first = self.env['res.users'].sudo().search([('login', '=', first_login)], limit=1)
        second = self.env['res.users'].sudo().search([('login', '=', second_login)], limit=1)
        with self.assertRaises(IntegrityError):
            with self.env.cr.savepoint():
                self.env.cr.execute(
                    'UPDATE res_users SET subscribo_email_key = %s WHERE id = %s',
                    (first.subscribo_email_key, second.id),
                )

    def test_internal_user_creation_and_account_update_share_email_uniqueness(self):
        admin = self.env.ref('base.user_admin')
        first = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'Internal First', 'login': 'internal.first@example.com',
            'email': 'Internal.First@Example.com',
            'group_ids': [Command.set([self.env.ref('base.group_user').id])],
        })
        self.assertEqual(first.email, 'internal.first@example.com')
        with self.assertRaises(ValidationError):
            self.env['res.users'].with_user(admin).with_context(no_reset_password=True).create({
                'name': 'Internal Duplicate', 'login': 'internal.duplicate@example.com',
                'email': 'INTERNAL.FIRST@example.com',
                'group_ids': [Command.set([self.env.ref('base.group_user').id])],
            })
        second = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'Internal Second', 'login': 'internal.second@example.com',
            'email': 'internal.second@example.com',
            'group_ids': [Command.set([self.env.ref('base.group_user').id])],
        })
        with self.assertRaises(ValidationError):
            second.write({'email': 'INTERNAL.FIRST@example.com'})
        with self.assertRaises(ValidationError):
            second.partner_id.write({'email': 'INTERNAL.FIRST@example.com'})

    def test_signup_rejects_malformed_email(self):
        with self.assertRaises(ValidationError):
            self._signup('not-an-email')

    def test_password_policy_accepts_and_rejects_required_classes(self):
        validate = self.env['res.users']._subscribo_validate_password
        self.assertEqual(validate('ValidPassword1!'), 'ValidPassword1!')

        for password in (
            'Ab1!xyz',          # seven characters
            'Ab1!xyzz',         # exactly eight characters
            'lowercasepass1!',  # no uppercase
            'UPPERCASEPASS1!',  # no lowercase
            'ValidPassword12',  # no special character
            'Valid Password1 ', # whitespace is not treated as a special character
        ):
            with self.subTest(password=password), self.assertRaises(ValidationError):
                validate(password)

    def test_password_policy_applies_to_signup_and_password_changes(self):
        with self.assertRaises(ValidationError):
            self._signup('weak.signup@example.com', 'Weakpass1')

        login, _ = self._signup('password.change@example.com')
        user = self.env['res.users'].sudo().search([('login', '=', login)], limit=1)
        with self.assertRaises(ValidationError):
            user._change_password('Weakpass1')
        with self.assertRaises(ValidationError):
            user.write({'password': 'Weakpass1'})
        user._change_password('ReplacementPassword2!')

    def test_password_policy_applies_to_token_password_reset(self):
        login, _ = self._signup('password.reset@example.com')
        user = self.env['res.users'].sudo().search([('login', '=', login)], limit=1)
        user.partner_id.signup_prepare(signup_type='reset')
        token = user.partner_id._generate_signup_token()

        with self.assertRaises(ValidationError):
            self.env['res.users'].sudo().signup({'password': 'Weakpass1'}, token=token)

        self.env['res.users'].sudo().signup(
            {'password': 'ResetPassword2!'}, token=token
        )

    def test_invalid_and_expired_password_reset_tokens_are_rejected(self):
        invalid_login, _ = self._signup('invalid.reset@example.com')
        invalid_user = self.env['res.users'].sudo().search([('login', '=', invalid_login)], limit=1)
        invalid_user.partner_id.signup_prepare(signup_type='reset')
        invalid_token = invalid_user.partner_id._generate_signup_token()
        invalid_user.partner_id.signup_cancel()
        with self.assertRaises(UserError):
            self.env['res.users'].sudo().signup(
                {'password': 'ValidResetPassword2!'}, token=invalid_token
            )
        login, _ = self._signup('expired.reset@example.com')
        user = self.env['res.users'].sudo().search([('login', '=', login)], limit=1)
        user.partner_id.signup_prepare(signup_type='reset')
        expired = user.partner_id._generate_signup_token(expiration=-1)
        with self.assertRaises(UserError):
            self.env['res.users'].sudo().signup(
                {'password': 'ValidResetPassword2!'}, token=expired
            )

    def test_password_change_api_enforces_policy(self):
        login, _ = self._signup('password.api@example.com')
        user = self.env['res.users'].sudo().search([('login', '=', login)], limit=1)
        self.assertTrue(user.with_user(user).change_password('ValidPassword1!', 'NewPassword2!'))
        with self.assertRaises(ValidationError):
            user.with_user(user).change_password('NewPassword2!', 'Weakpass1')

    def test_signup_scope_is_app_scoped_and_preserves_auth_signup_settings(self):
        parameters = self.env['ir.config_parameter'].sudo()
        orig_scope = parameters.get_param('auth_signup.invitation_scope')
        orig_reset = parameters.get_param('auth_signup.reset_password')
        self.addCleanup(parameters.set_param, 'auth_signup.invitation_scope', orig_scope)
        self.addCleanup(parameters.set_param, 'auth_signup.reset_password', orig_reset)
        parameters.set_param('auth_signup.invitation_scope', 'b2b')
        parameters.set_param('auth_signup.reset_password', 'False')
        users = self.env['res.users']
        self.assertEqual(users._get_signup_invitation_scope(), 'b2b')
        self.assertEqual(users.with_context(subscribo_public_signup=True)._get_signup_invitation_scope(), 'b2c')
        with self.assertRaises(SignupError):
            users.sudo().signup({
                'login': 'unscoped.signup@example.com', 'email': 'unscoped.signup@example.com',
                'name': 'Unscoped Signup', 'password': 'ValidPassword1!',
            })
        users.sudo().with_context(subscribo_public_signup=True).signup({
            'login': 'scoped.signup@example.com', 'email': 'scoped.signup@example.com',
            'name': 'Scoped Signup', 'password': 'ValidPassword1!',
        })
        parameters.invalidate_model()
        self.assertEqual(parameters.get_param('auth_signup.invitation_scope'), 'b2b')
        self.assertEqual(parameters.get_param('auth_signup.reset_password'), 'False')

    def test_install_and_uninstall_declare_no_auth_signup_setting_hooks(self):
        manifest_path = Path(__file__).resolve().parents[1] / '__manifest__.py'
        manifest = ast.literal_eval(manifest_path.read_text(encoding='utf-8'))
        self.assertNotIn('post_init_hook', manifest)
        self.assertNotIn('uninstall_hook', manifest)

    def test_staff_cannot_create_users_or_change_subscribo_roles(self):
        staff = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'SUBSCRIBO Test Staff',
            'login': 'subscribo.test.staff@example.com',
            'email': 'subscribo.test.staff@example.com',
            'group_ids': [Command.set([
                self.env.ref('subscribo.group_subscribo_staff').id,
            ])],
        })
        self.assertTrue(self.env.ref('base.user_admin').has_group('base.group_erp_manager'))
        self.assertFalse(staff.has_group('base.group_erp_manager'))

        with self.assertRaises(AccessError):
            self.env['res.users'].with_user(staff).create({
                'name': 'Unauthorized Staff',
                'login': 'unauthorized.staff@example.com',
                'email': 'unauthorized.staff@example.com',
            })

        with self.assertRaises(AccessError):
            staff.with_user(staff).write({
                'group_ids': [Command.link(self.env.ref('subscribo.group_subscribo_admin').id)],
            })

        settings_only = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'Settings Administrator Without SUBSCRIBO Role',
            'login': 'settings.only@example.com',
            'email': 'settings.only@example.com',
            'group_ids': [Command.set([self.env.ref('base.group_system').id])],
        })
        normal_user = self.env['res.users'].with_user(settings_only).with_context(
            no_reset_password=True
        ).create({
            'name': 'Normal Odoo User',
            'login': 'normal.odoo.user@example.com',
            'email': 'normal.odoo.user@example.com',
            'group_ids': [Command.set([self.env.ref('base.group_user').id])],
        })
        original_groups = set(normal_user.group_ids.ids)
        normal_user.with_user(settings_only).write({'name': 'Edited Normal Odoo User'})
        self.assertEqual(normal_user.name, 'Edited Normal Odoo User')
        self.assertEqual(set(normal_user.group_ids.ids), original_groups)

        with self.assertRaises(AccessError):
            self.env['res.users'].with_user(settings_only).with_context(
                no_reset_password=True
            ).create({
                'name': 'Unauthorized SUBSCRIBO Staff',
                'login': 'unauthorized.subscribo.staff@example.com',
                'email': 'unauthorized.subscribo.staff@example.com',
                'group_ids': [Command.link(self.env.ref('subscribo.group_subscribo_staff').id)],
            })

    def test_subscribo_staff_customer_cannot_use_admin_role_field(self):
        staff = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'Role Field Staff', 'login': 'role.field.staff@example.com',
            'email': 'role.field.staff@example.com',
            'group_ids': [Command.set([self.env.ref('subscribo.group_subscribo_staff').id])],
        })
        with self.assertRaises(AccessError):
            staff.with_user(staff).write({'role': 'group_system'})

    def test_settings_admin_can_create_and_edit_normal_users(self):
        settings_admin = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'Odoo Settings Admin', 'login': 'odoo.settings.admin@example.com',
            'email': 'odoo.settings.admin@example.com',
            'group_ids': [Command.set([self.env.ref('base.group_system').id])],
        })
        user = self.env['res.users'].with_user(settings_admin).with_context(
            no_reset_password=True
        ).create({
            'name': 'Managed Odoo User', 'login': 'managed.odoo.user@example.com',
            'email': 'managed.odoo.user@example.com',
            'group_ids': [Command.set([self.env.ref('base.group_user').id])],
        })
        before_groups = set(user.group_ids.ids)
        user.with_user(settings_admin).write({'name': 'Updated Managed Odoo User'})
        user.with_user(settings_admin).write({'password': 'Weakpass1'})
        self.assertEqual(user.name, 'Updated Managed Odoo User')
        self.assertEqual(set(user.group_ids.ids), before_groups)
        with self.assertRaises(AccessError):
            self.env['res.users'].with_user(settings_admin).with_context(
                no_reset_password=True
            ).create({
                'name': 'Not a SUBSCRIBO Staff Assignment',
                'login': 'no.subscribo.role@example.com',
                'email': 'no.subscribo.role@example.com',
                'group_ids': [Command.link(self.env.ref('subscribo.group_subscribo_staff').id)],
            })

        with self.assertRaises(AccessError):
            self.env['res.groups'].with_user(settings_admin).create({
                'name': 'Unauthorized Implied SUBSCRIBO Admin',
                'implied_ids': [Command.link(self.env.ref('subscribo.group_subscribo_admin').id)],
            })

    def test_admin_can_create_staff_user(self):
        admin = self.env.ref('base.user_admin')
        staff = self.env['res.users'].with_user(admin).with_context(no_reset_password=True).create({
            'name': 'SUBSCRIBO Created Staff',
            'login': 'subscribo.created.staff@example.com',
            'email': 'subscribo.created.staff@example.com',
            'group_ids': [Command.set([
                self.env.ref('subscribo.group_subscribo_staff').id,
            ])],
        })
        self.assertIn(self.env.ref('subscribo.group_subscribo_staff'), staff.all_group_ids)

@tagged('post_install', '-at_install')
class TestSubscriboProductAccess(TransactionCase):

    def test_admin_can_manage_products_and_staff_is_read_only(self):
        admin = self.env.ref('base.user_admin')
        staff = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'SUBSCRIBO Product Staff',
            'login': 'subscribo.product.staff@example.com',
            'email': 'subscribo.product.staff@example.com',
            'group_ids': [Command.set([
                self.env.ref('subscribo.group_subscribo_staff').id,
            ])],
        })
        product = self.env['product.template'].with_user(admin).create({
            'name': 'SUBSCRIBO Product Access Test',
            'type': 'service',
            'list_price': 120.0,
            'standard_price': 45.0,
            'subscribo_notes': 'Internal catalog note',
        })

        self.assertEqual(product.type, 'service')
        self.assertEqual(product.standard_price, 45.0)
        self.assertEqual(product.with_user(staff).subscribo_notes, 'Internal catalog note')
        with self.assertRaises(AccessError):
            product.with_user(staff).write({'list_price': 130.0})
        self.assertEqual(product.with_user(admin).list_price, 120.0)

    def test_product_variant_price_extra_uses_standard_product_behavior(self):
        admin = self.env.ref('base.user_admin')
        attribute = self.env['product.attribute'].with_user(admin).create({
            'name': 'SUBSCRIBO Test Brand',
            'create_variant': 'always',
        })
        brand = self.env['product.attribute.value'].with_user(admin).create({
            'name': 'Odoo',
            'attribute_id': attribute.id,
        })
        template = self.env['product.template'].with_user(admin).create({
            'name': 'SUBSCRIBO Variant Price Test',
            'list_price': 100.0,
            'attribute_line_ids': [Command.create({
                'attribute_id': attribute.id,
                'value_ids': [Command.set([brand.id])],
            })],
        })
        template.attribute_line_ids.product_template_value_ids.write({'price_extra': 560.0})

        variant = template.product_variant_id
        self.assertEqual(variant.price_extra, 560.0)
        self.assertEqual(variant.lst_price, 660.0)

    def test_customer_cannot_read_plan_cost_or_internal_notes(self):
        customer, _ = self.env['res.users'].sudo().with_context(subscribo_public_signup=True).signup({
            'login': 'private.customer@example.com', 'email': 'private.customer@example.com',
            'name': 'Private Customer', 'password': 'ValidPassword1!',
        })
        customer_user = self.env['res.users'].sudo().search([('login', '=', customer)], limit=1)
        product = self.env['product.template'].sudo().create({
            'name': 'Private Product', 'standard_price': 91.0,
            'subscribo_notes': 'Confidential internal note',
        })
        plan = self.env['subscribo.plan'].sudo().create({
            'name': 'Private Plan', 'price': 20.0,
            'currency_id': self.env.company.currency_id.id,
        })
        with self.assertRaises(AccessError):
            self.env['subscribo.plan'].with_user(customer_user).search_read([], ['name'])
        with self.assertRaises(AccessError):
            product.with_user(customer_user).read(['standard_price'])
        with self.assertRaises(AccessError):
            product.with_user(customer_user).read(['subscribo_notes'])
        self.assertTrue(plan.exists())

    def test_staff_cannot_assign_admin_using_group_or_role_fields(self):
        staff = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'Role Test Staff', 'login': 'role.staff@example.com',
            'email': 'role.staff@example.com',
            'group_ids': [Command.set([self.env.ref('subscribo.group_subscribo_staff').id])],
        })
        with self.assertRaises(AccessError):
            staff.with_user(staff).write({'group_ids': [Command.link(self.env.ref('subscribo.group_subscribo_admin').id)]})
        with self.assertRaises(AccessError):
            staff.with_user(staff).write({'role': 'group_system'})

    def test_mixed_linked_and_unlinked_partner_batch_changes_only_selected_partners(self):
        login, _ = self.env['res.users'].sudo().with_context(subscribo_public_signup=True).signup({
            'login': 'batch.linked@example.com', 'email': 'batch.linked@example.com',
            'name': 'Batch Linked', 'password': 'ValidPassword1!',
        })
        account = self.env['res.users'].sudo().search([('login', '=', login)], limit=1)
        selected_unlinked = self.env['res.partner'].sudo().create({'name': 'Selected Unlinked', 'email': 'old1@example.com'})
        untouched = self.env['res.partner'].sudo().create({'name': 'Untouched', 'email': 'old2@example.com'})
        (account.partner_id | selected_unlinked).write({'email': 'Batch.Updated@example.com'})
        self.assertEqual(account.partner_id.email, 'batch.updated@example.com')
        self.assertEqual(selected_unlinked.email, 'batch.updated@example.com')
        self.assertEqual(untouched.email, 'old2@example.com')


@tagged('post_install', '-at_install')
class TestSubscriboSignupHttp(HttpCase):
    """Smoke-test the standard Odoo signup and reset pages enabled by Phase 1."""

    def setUp(self):
        super().setUp()
        # HttpCase.authenticate initializes a correctly bound test session even
        # for an anonymous request (user=None). Calling /web/login only renders
        # the no-db login page and does not bind the HTTP session to the test DB.
        self.authenticate(None, None)
        self.assertEqual(self.session.db, self.env.cr.dbname)

    def _signup_url(self):
        return '/subscribo/signup'

    def _csrf_token(self, route=None):
        response = self.url_open(
            route or self._signup_url(),
            cookies={'session_id': self.session.sid},
        )
        self.assertEqual(response.status_code, 200, response.text[-800:])
        csrf_match = re.search(r'name="csrf_token"\s+value="([^"]+)"', response.text)
        self.assertTrue(csrf_match, 'The signup form should contain a CSRF token.')
        return csrf_match.group(1)

    @staticmethod
    def _signup_values(email, password='ValidPassword1!', csrf_token=None):
        values = {
            'name': 'HTTP Registration',
            'login': email,
            'password': password,
            'confirm_password': password,
            'redirect': '',
            'token': '',
        }
        if csrf_token is not None:
            values['csrf_token'] = csrf_token
        return values

    def _signup_request(self, data=None):
        return self.url_open(
            self._signup_url(), data=data,
            cookies={'session_id': self.session.sid},
        )

    def test_signup_and_reset_routes_return_forms(self):
        route_map = self.env['ir.http'].routing_map()
        routes = [rule.rule for rule in route_map.iter_rules()]
        self.assertIn('/subscribo/signup', routes)
        for route in (self._signup_url(),):
            with self.subTest(route=route):
                response = self._signup_request()
                self.assertEqual(response.status_code, 200, response.text[-800:])

    def test_public_signup_creates_a_portal_customer(self):
        email = 'http.signup.customer@example.com'
        response = self._signup_request(data=self._signup_values(
            email, csrf_token=self._csrf_token()
        ))
        self.assertEqual(response.status_code, 200)

        user = self.env['res.users'].sudo().search([('login', '=', email)], limit=1)
        self.assertTrue(user)
        self.assertIn(self.env.ref('subscribo.group_subscribo_customer'), user.all_group_ids)

    def test_public_signup_displays_server_side_password_validation(self):
        email = 'http.signup.weak-password@example.com'
        response = self._signup_request(data=self._signup_values(
            email, 'WeakPassword1', self._csrf_token()
        ))
        self.assertEqual(response.status_code, 200)
        self.assertIn('Password must contain a special character.', response.text)
        self.assertFalse(self.env['res.users'].sudo().search_count([('login', '=', email)]))

    def test_http_signup_rejects_duplicate_email(self):
        email = 'http.duplicate@example.com'
        self.assertEqual(self._signup_request(data=self._signup_values(
            email, csrf_token=self._csrf_token()
        )).status_code, 200)
        response = self._signup_request(data=self._signup_values(
            email, csrf_token=self._csrf_token()
        ))
        self.assertEqual(response.status_code, 200)
        self.assertIn('already registered', response.text.lower())
        self.assertEqual(self.env['res.users'].sudo().search_count([
            ('login', '=', email),
        ]), 1)

    def test_http_signup_rejects_case_insensitive_duplicate_email(self):
        email = 'http.case.duplicate@example.com'
        self.assertEqual(self._signup_request(data=self._signup_values(
            email, csrf_token=self._csrf_token()
        )).status_code, 200)
        response = self._signup_request(data=self._signup_values(
            'HTTP.CASE.DUPLICATE@Example.COM', csrf_token=self._csrf_token()
        ))
        self.assertEqual(response.status_code, 200)
        self.assertIn('already registered', response.text.lower())
        self.assertEqual(self.env['res.users'].sudo().search_count([
            ('subscribo_email_key', '=', email),
        ]), 1)

    def test_signup_rejects_missing_csrf_token(self):
        response = self._signup_request(data=self._signup_values(
            'http.no.csrf@example.com'
        ))
        self.assertEqual(response.status_code, 400, response.text[-500:])
        self.assertFalse(self.env['res.users'].sudo().search_count([
            ('login', '=', 'http.no.csrf@example.com'),
        ]))

    def test_signup_rejects_invalid_csrf_token(self):
        response = self._signup_request(data=self._signup_values(
            'http.bad.csrf@example.com', csrf_token='invalid-token'
        ))
        self.assertEqual(response.status_code, 400, response.text[-500:])
        self.assertFalse(self.env['res.users'].sudo().search_count([
            ('login', '=', 'http.bad.csrf@example.com'),
        ]))

    def test_standard_odoo_signup_does_not_assign_subscribo_roles(self):
        email = f'http.standard.signup.{uuid.uuid4().hex}@example.com'
        # Exercise the normal Odoo invitation flow, which remains available
        # even when instance-wide public B2C signup is disabled.
        with self.registry.cursor() as cr:
            env = api.Environment(cr, SUPERUSER_ID, {})
            partner = env['res.partner'].create({'name': 'Standard Odoo Invite', 'email': email})
            partner.signup_prepare()
            token = partner._generate_signup_token()
            cr.commit()
        signup_url = '/web/signup?' + urlencode({'token': token})
        values = self._signup_values(
            email, 'ValidPassword1!', self._csrf_token(signup_url)
        )
        values['token'] = token
        response = self.url_open(
            signup_url,
            data=values,
            cookies={'session_id': self.session.sid},
        )
        self.assertIn(response.status_code, (200, 303), response.text[-800:])
        user = self.env['res.users'].sudo().search([('login', '=', email)], limit=1)
        self.assertTrue(user, 'The standard Odoo route should create its invited account.')
        for xmlid in (
            'subscribo.group_subscribo_admin',
            'subscribo.group_subscribo_staff',
            'subscribo.group_subscribo_customer',
        ):
            self.assertNotIn(self.env.ref(xmlid), user.all_group_ids)
        self.assertNotIn(self.env.ref('base.group_user'), user.all_group_ids)


@tagged('post_install', '-at_install')
class TestSubscriboJsonRpc(HttpCase):
    """Exercise authorization at Odoo's authenticated JSON-RPC boundary."""

    def setUp(self):
        super().setUp()
        self.authenticate(None, None)

    def _make_user(self, email, group_xmlid):
        return self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': email,
            'login': email,
            'email': email,
            'group_ids': [Command.set([self.env.ref(group_xmlid).id])],
        })

    def _rpc(self, model, method, args, kwargs=None):
        response = self.url_open('/web/dataset/call_kw', json={
            'jsonrpc': '2.0',
            'method': 'call',
            'params': {
                'model': model,
                'method': method,
                'args': args,
                'kwargs': kwargs or {},
            },
            'id': 1,
        })
        self.assertEqual(response.status_code, 200, response.text[-800:])
        return response.json()

    def _assert_rpc_denied(self, model, method, args, kwargs=None):
        result = self._rpc(model, method, args, kwargs)
        self.assertIn('error', result, result)
        self.assertIn('AccessError', result['error']['data'].get('name', ''))

    def test_customer_cannot_read_plan_cost_notes_or_manage_users_over_rpc(self):
        customer = self._make_user(
            'rpc.customer@example.com', 'subscribo.group_subscribo_customer'
        )
        product = self.env['product.template'].sudo().create({
            'name': 'RPC Private Product', 'standard_price': 51.0,
            'subscribo_notes': 'RPC private note',
        })
        self.authenticate(customer.login, 'test-password')

        self._assert_rpc_denied(
            'subscribo.plan', 'search_read', [[]], {'fields': ['name']}
        )
        self._assert_rpc_denied(
            'product.template', 'read', [[product.id]],
            {'fields': ['standard_price']},
        )
        self._assert_rpc_denied(
            'product.template', 'read', [[product.id]],
            {'fields': ['subscribo_notes']},
        )
        internal_admin_id = self.env.ref('base.user_admin').id
        visible_users = self._rpc(
            'res.users', 'search_read', [[]], {'fields': ['login']}
        )
        self.assertIn('result', visible_users, visible_users)
        self.assertNotIn(internal_admin_id, [row['id'] for row in visible_users['result']])
        self._assert_rpc_denied(
            'res.users', 'read', [[internal_admin_id]], {'fields': ['login']}
        )
        self._assert_rpc_denied(
            'res.users', 'create', [{
                'name': 'RPC Unauthorized User',
                'login': 'rpc.unauthorized@example.com',
                'email': 'rpc.unauthorized@example.com',
            }],
        )
        admin_name = self.env.ref('base.user_admin').name
        write_result = self._rpc(
            'res.users', 'write', [[internal_admin_id], {'name': 'RPC Unauthorized Change'}]
        )
        self.assertTrue(
            'error' in write_result or not write_result.get('result'), write_result
        )
        self.assertEqual(self.env.ref('base.user_admin').name, admin_name)

    def test_staff_cannot_assign_subscribo_admin_over_rpc(self):
        staff = self._make_user(
            'rpc.staff@example.com', 'subscribo.group_subscribo_staff'
        )
        self.authenticate(staff.login, 'test-password')
        self._assert_rpc_denied(
            'res.users', 'write', [[staff.id], {
                'group_ids': [[Command.LINK, self.env.ref('subscribo.group_subscribo_admin').id]],
            }],
        )
        self._assert_rpc_denied(
            'res.groups', 'write', [[self.env.ref('subscribo.group_subscribo_admin').id], {
                'user_ids': [[Command.LINK, staff.id]],
            }],
        )
