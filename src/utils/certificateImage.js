// Exports the group-stage champion certificate by snapshotting the *actual*
// styled card from the DOM, so the shared image / printed PDF look identical to
// the on-screen version — no parallel hand-drawn design to drift out of sync.
//
// We clone the live card, force a print-friendly light palette (via the
// `cert--export` class, which redefines the theme custom properties), drop the
// action buttons, and rasterise it with html-to-image onto an opaque white
// background — which is what fixes the "transparent background" exports.

import { toBlob } from 'html-to-image';

// Wait for the document's web fonts so the captured title isn't a fallback face.
async function ensureFonts() {
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts are best-effort; system fallback is fine */
  }
}

// Resolve once every <img> in the clone has settled (loaded or errored), so the
// snapshot isn't taken before the avatar paints. Capped so a stuck remote photo
// can't hang the export.
function waitForImages(root) {
  const imgs = Array.from(root.querySelectorAll('img'));
  return Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 2000);
      });
    })
  );
}

// Snapshots the live certificate card to an opaque PNG Blob.
export async function renderCertificateBlob(cardEl) {
  if (!cardEl) throw new Error('certificate card element missing');
  await ensureFonts();

  // Clone so we never disturb the visible modal while preparing the snapshot.
  const clone = cardEl.cloneNode(true);
  clone.classList.add('cert--export');
  clone.querySelectorAll('.cert__actions, .cert__close').forEach((n) => n.remove());

  // Render off-screen at its natural (full, un-clipped) height.
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed; left:-10000px; top:0; pointer-events:none;';
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitForImages(clone);
    const blob = await toBlob(clone, {
      pixelRatio: 2, // crisp on retina / when printed
      backgroundColor: '#ffffff', // opaque paper — no transparent corners
      cacheBust: true,
    });
    if (!blob) throw new Error('toBlob returned null');
    return blob;
  } finally {
    host.remove();
  }
}

function slug(name) {
  return (
    String(name || 'oraculo')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'oraculo'
  );
}

function nicknameFrom(cardEl) {
  return cardEl?.querySelector('.cert__name')?.textContent?.trim() || '';
}

// Generates the image and shares it (mobile) or downloads it (desktop).
// Returns 'shared' | 'downloaded' | 'cancelled'.
export async function shareCertificate(cardEl, t) {
  const blob = await renderCertificateBlob(cardEl);
  const filename = `oraculo-${slug(nicknameFrom(cardEl))}.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: t('certShareCaption'), text: t('certShareCaption') });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
      // fall through to download on any other share failure
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

// "Save as PDF" via native print. We print the rasterised image inside a hidden
// iframe (not window.print() of the page): the gold background is baked into the
// pixels, so it prints reliably regardless of the browser's "background graphics"
// setting — which the old @media-print path could not guarantee.
export async function printCertificate(cardEl) {
  const blob = await renderCertificateBlob(cardEl);
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed; right:0; bottom:0; width:0; height:0; border:0;';
  document.body.appendChild(iframe);

  const cleanup = () => {
    iframe.remove();
    URL.revokeObjectURL(url);
  };

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Certificado</title>` +
      `<style>@page{margin:12mm;}html,body{margin:0;padding:0;}` +
      `img{width:100%;height:auto;display:block;}</style></head>` +
      `<body><img src="${url}" alt=""></body></html>`
  );
  doc.close();

  const img = doc.querySelector('img');
  await new Promise((resolve) => {
    if (img.complete) return resolve();
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
    setTimeout(resolve, 2000);
  });

  const win = iframe.contentWindow;
  win.addEventListener('afterprint', cleanup, { once: true });
  win.focus();
  win.print();
  // Fallback cleanup in browsers that don't fire afterprint.
  setTimeout(cleanup, 60000);
}
