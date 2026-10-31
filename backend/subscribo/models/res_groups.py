from odoo import Command, SUPERUSER_ID, _, api, models
from odoo.exceptions import AccessError


class ResGroups(models.Model):
    _inherit = 'res.groups'

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

    @api.model
    def _subscribo_is_admin(self):
        return (
            self.env.uid == SUPERUSER_ID
            or self.env.user.has_group('subscribo.group_subscribo_admin')
        )

    @api.model
    def _subscribo_command_ids(self, commands):
        """Collect group IDs in relational commands, including nested creates."""
        found = set()
        for command in commands or []:
            operation = command[0]
            if operation in (Command.LINK, Command.UNLINK):
                found.add(command[1])
            elif operation == Command.SET:
                found.update(command[2])
            elif operation == Command.CREATE:
                values = command[2]
                found.update(self._subscribo_command_ids(values.get('implied_ids')))
                found.update(self._subscribo_command_ids(values.get('implied_by_ids')))
        return found

    @api.model
    def _subscribo_check_role_group_mutation(self, values, creating=False):
        if self._subscribo_is_admin():
            return

        role_ids = self._subscribo_role_group_ids()
        if not role_ids:
            return

        # res.groups.user_ids and all_user_ids are alternate write paths for
        # the same res_groups_users_rel memberships guarded on res.users.
        for field_name in ('user_ids', 'all_user_ids'):
            if values.get(field_name):
                target_roles = set(self.ids)
                if not creating:
                    target_roles.update(self.mapped('all_implied_ids').ids)
                target_roles.update(self._subscribo_command_ids(values.get('implied_ids')))
                if target_roles & role_ids:
                    raise AccessError(_('Only a SUBSCRIBO administrator can assign SUBSCRIBO roles.'))

        # A non-SUBSCRIBO administrator must not create or edit a group that
        # directly implies a SUBSCRIBO role, including through the inverse
        # implied_by_ids relation or nested relational commands.
        for field_name in ('implied_ids', 'implied_by_ids'):
            if field_name not in values:
                continue
            referenced = self._subscribo_command_ids(values[field_name])
            affects_role = bool(referenced & role_ids) or bool(set(self.ids) & role_ids)
            if not creating:
                if field_name == 'implied_ids':
                    affects_role = affects_role or bool(
                        set(self.mapped('all_implied_ids').ids) & role_ids
                    )
                else:
                    affects_role = affects_role or bool(set(self.ids) & role_ids)
            if affects_role:
                raise AccessError(_('Only a SUBSCRIBO administrator can change SUBSCRIBO role inheritance.'))

    @api.model_create_multi
    def create(self, vals_list):
        for values in vals_list:
            self._subscribo_check_role_group_mutation(values, creating=True)
        return super().create(vals_list)

    def write(self, values):
        self._subscribo_check_role_group_mutation(values)
        return super().write(values)

    def unlink(self):
        if not self._subscribo_is_admin():
            role_ids = self._subscribo_role_group_ids()
            affected_roles = set(self.ids) & role_ids
            affected_roles.update(set(self.mapped('all_implied_ids').ids) & role_ids)
            if affected_roles:
                raise AccessError(_('Only a SUBSCRIBO administrator can remove SUBSCRIBO roles.'))
        return super().unlink()
