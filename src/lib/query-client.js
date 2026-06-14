import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,       // البيانات صالحة 30 ثانية (لا إعادة جلب في كل تنقل)
      gcTime: 1000 * 60 * 5,      // تبقى في الذاكرة 5 دقائق
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
