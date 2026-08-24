<script setup lang="ts">
import type { SupportedLanguagesType } from '@frontend/locales';

import { SUPPORT_LANGUAGES } from '@frontend/constants';
import { Languages } from '@frontend/icons';
import { loadLocaleMessages } from '@frontend/locales';
import { preferences, updatePreferences } from '@frontend/preferences';

import {
  VbenDropdownRadioMenu,
  VbenIconButton,
} from '@frontend-core/shadcn-ui';

defineOptions({
  name: 'LanguageToggle',
});

async function handleUpdate(value: string | undefined) {
  if (!value) return;
  const locale = value as SupportedLanguagesType;
  updatePreferences({
    app: {
      locale,
    },
  });
  await loadLocaleMessages(locale);
}
</script>

<template>
  <div>
    <VbenDropdownRadioMenu
      :menus="SUPPORT_LANGUAGES"
      :model-value="preferences.app.locale"
      @update:model-value="handleUpdate"
    >
      <VbenIconButton class="hover:animate-[shrink_0.3s_ease-in-out]">
        <Languages class="size-4 text-foreground" />
      </VbenIconButton>
    </VbenDropdownRadioMenu>
  </div>
</template>
