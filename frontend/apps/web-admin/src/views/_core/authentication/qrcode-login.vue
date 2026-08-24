<script lang="ts" setup>
import { AuthenticationQrCodeLogin } from '@frontend/common-ui';
import { LOGIN_PATH } from '@frontend/constants';

defineOptions({ name: 'QrCodeLogin' });
</script>

<template>
  <AuthenticationQrCodeLogin :login-path="LOGIN_PATH" />
</template>
