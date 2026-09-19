import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '../api/uploads.api';
import { useOvaUploads } from './use-uploads';

vi.mock('../api/uploads.api', () => ({ fetchTemporaryFiles: vi.fn(() => Promise.resolve({ items: [] })), uploadTemporaryFiles: vi.fn(), removeTemporaryFile: vi.fn() }));
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(useOvaUploads, { wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
}
describe('useOvaUploads', () => {
  beforeEach(() => vi.clearAllMocks());
  it('rejects over-limit batches without silently dropping files', async () => {
    const { result } = setup();
    await waitFor(() => { expect(result.current.isSuccess).toBe(true); });
    await act(() => result.current.addFiles(Array.from({ length: 6 }, () => new File(['x'], 'ref.pdf'))));
    expect(api.uploadTemporaryFiles).not.toHaveBeenCalled();
    expect(result.current.uploadError).toContain('hasta 5 archivos');
  });
  it('always releases uploading state after network failure', async () => {
    vi.mocked(api.uploadTemporaryFiles).mockRejectedValue(new Error('Sin conexión'));
    const { result } = setup();
    await act(() => result.current.addFiles([new File(['x'], 'ref.pdf')]));
    expect(result.current.uploading).toBe(false);
    expect(result.current.uploadError).toBe('Sin conexión');
  });
  it('surfaces per-file errors from successful HTTP responses', async () => {
    vi.mocked(api.uploadTemporaryFiles).mockResolvedValue({ errors: [{ message: 'Archivo demasiado grande' }] });
    const { result } = setup();
    await act(() => result.current.addFiles([new File(['x'], 'ref.pdf')]));
    expect(result.current.uploadError).toBe('Archivo demasiado grande');
    expect(result.current.uploading).toBe(false);
  });
});
