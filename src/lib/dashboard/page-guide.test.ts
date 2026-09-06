import { afterEach, describe, expect, it } from 'vitest';
import {
  pageGuideStorageKey,
  readPageGuideVisible,
  writePageGuideVisible,
} from './page-guide';

describe('page-guide storage helpers', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('namespaces the storage key per page', () => {
    expect(pageGuideStorageKey('matching')).toBe('forpro_page_guide:matching');
  });

  it('keeps the guide hidden by default (no stored preference)', () => {
    expect(readPageGuideVisible('matching')).toBe(false);
    expect(readPageGuideVisible('cvs')).toBe(false);
  });

  it('persists a revealed guide per page', () => {
    writePageGuideVisible('matching', true);
    expect(readPageGuideVisible('matching')).toBe(true);
    // Other pages keep their own (hidden) state.
    expect(readPageGuideVisible('cvs')).toBe(false);
  });

  it('removes the marker when the guide is hidden again', () => {
    writePageGuideVisible('matching', true);
    writePageGuideVisible('matching', false);
    expect(window.localStorage.getItem('forpro_page_guide:matching')).toBeNull();
    expect(readPageGuideVisible('matching')).toBe(false);
  });
});
