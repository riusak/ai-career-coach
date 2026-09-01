import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware navigation wrappers — use these instead of the bare next/link
 * primitives so that a future locale-prefix switch keeps everything aligned.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);