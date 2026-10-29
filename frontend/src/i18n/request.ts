import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import enUS from '@/messages/en-US.json';
import zhCN from '@/messages/zh-CN.json';

const messagesByLocale = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

type AppLocale = keyof typeof messagesByLocale;

function resolveLocale(value: string | undefined): AppLocale {
  return value === 'en-US' ? 'en-US' : 'zh-CN';
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get('locale')?.value);

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
