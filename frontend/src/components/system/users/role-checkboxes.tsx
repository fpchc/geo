'use client';

import type { Role } from '@/lib/api/users-client';

export function RoleCheckboxes({
  roles,
  value,
  onChange,
  disabled = false,
}: {
  roles: Role[];
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {roles.map((role) => {
        const checked = value.includes(role.id);

        return (
          <label key={role.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={(event) =>
                onChange(
                  event.target.checked ? [...value, role.id] : value.filter((id) => id !== role.id),
                )
              }
            />
            {role.name}
          </label>
        );
      })}
    </div>
  );
}
