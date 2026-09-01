import 'next-intl';

declare module 'next-intl' {
  interface AppConfig {
    messages: {
      common: Record<string, string>;
      nav: Record<string, string>;
      language: Record<string, string>;
      landing: Record<string, string | Record<string, string>>;
      auth: Record<string, string>;
      dashboard: Record<string, string>;
      profile: Record<string, string>;
      footer: Record<string, string>;
    };
  }
}