import {describe, expect, it, vi} from 'vitest';
import {
  diagnoseTryOnAssets,
  describeAssetProbes,
} from '../../app/lib/try-on/assets';

function response(status: number, contentType?: string) {
  return new Response(null, {
    status,
    headers: contentType ? {'content-type': contentType} : undefined,
  });
}

describe('diagnoseTryOnAssets', () => {
  it('reports the status and content type of every asset', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('vision_wasm_internal.wasm')) {
        return response(404, 'text/html');
      }
      if (url.includes('vision_wasm_internal.js')) {
        return response(200, 'text/javascript');
      }
      return response(200, 'application/octet-stream');
    });

    const probes = await diagnoseTryOnAssets(fetchMock);

    expect(probes.map((probe) => probe.key)).toEqual([
      'loaderUrl',
      'wasmUrl',
      'modelUrl',
    ]);
    expect(probes[0]).toMatchObject({ok: true, status: 200});
    expect(probes[1]).toMatchObject({
      ok: false,
      status: 404,
      contentType: 'text/html',
    });
    expect(probes[2]).toMatchObject({ok: true, status: 200});
  });

  it('treats an HTML page with a 200 status as a failed asset', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response(200, 'text/html; charset=utf-8'));

    const probes = await diagnoseTryOnAssets(fetchMock);

    expect(probes.every((probe) => !probe.ok)).toBe(true);
  });

  it('makes a cheap ranged request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, 'application/wasm'));

    await diagnoseTryOnAssets(fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
      cache: 'no-store',
      headers: {Range: 'bytes=0-0'},
    });
  });

  it('records a network failure instead of throwing', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));

    const probes = await diagnoseTryOnAssets(fetchMock);

    expect(probes.every((probe) => !probe.ok)).toBe(true);
    expect(probes[0].error).toContain('TypeError: Failed to fetch');
  });
});

describe('describeAssetProbes', () => {
  it('summarises the path, status and MIME type', () => {
    const summary = describeAssetProbes([
      {
        key: 'wasmUrl',
        url: '/assets/vision_wasm_internal-abc123.wasm',
        ok: false,
        status: 404,
        contentType: 'text/html',
      },
    ]);

    expect(summary).toBe(
      'wasm /assets/vision_wasm_internal-abc123.wasm 404 text/html',
    );
  });

  it('falls back to the network error', () => {
    const summary = describeAssetProbes([
      {key: 'modelUrl', url: '/assets/model.task', ok: false, error: 'TypeError: down'},
    ]);

    expect(summary).toBe('model /assets/model.task TypeError: down');
  });
});
