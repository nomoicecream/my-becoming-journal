/**
 * Reusable UI components: Modal, Toast.
 */

/* ---- Toast notifications ---- */
let toastTimer = null;
export function showToast(message, duration = 2500) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  if (toastTimer) clearTimeout(toastTimer);

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

/* ---- Modal ---- */

// Track open overlays so they can be closed in bulk (e.g. on route change).
const openOverlays = new Set();

export function closeAllModals() {
  for (const overlay of Array.from(openOverlays)) {
    overlay.remove();
  }
  openOverlays.clear();
}

/**
 * Opens a modal with the given content.
 * Returns a controller object: { close(), el }
 */
export function openModal({ title, content, actions, closable = true, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  // Header
  const header = document.createElement('div');
  header.className = 'modal__header';

  const titleEl = document.createElement('div');
  titleEl.className = 'modal__title';
  titleEl.textContent = title || '';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal__close';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close');

  header.appendChild(titleEl);
  if (closable) header.appendChild(closeBtn);
  modal.appendChild(header);

  // Content
  if (content) {
    if (typeof content === 'string') {
      const div = document.createElement('div');
      div.innerHTML = content;
      modal.appendChild(div);
    } else {
      modal.appendChild(content);
    }
  }

  // Actions
  if (actions && actions.length) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'modal__actions';
    for (const action of actions) {
      const btn = document.createElement('button');
      btn.className = `btn ${action.variant || 'btn--ghost'}`;
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        if (action.onClick) {
          const result = action.onClick();
          if (result !== false) closeModal();
        } else {
          closeModal();
        }
      });
      actionsEl.appendChild(btn);
    }
    modal.appendChild(actionsEl);
  }

  overlay.appendChild(modal);

  function closeModal() {
    if (overlay.dataset.closing === '1') return; // already closing
    overlay.dataset.closing = '1';
    openOverlays.delete(overlay);
    // Stop the fading overlay from intercepting clicks while it animates out
    overlay.style.pointerEvents = 'none';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.15s ease';
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 150);
  }

  closeBtn.addEventListener('click', closeModal);
  if (closable) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape' && closable) {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);
  openOverlays.add(overlay);

  return {
    el: modal,
    close: closeModal,
  };
}

/**
 * Confirmation dialog.
 */
export function confirmDialog({ title, message, confirmLabel, cancelLabel, onConfirm, danger = false }) {
  return openModal({
    title: title || 'Confirm',
    content: typeof message === 'string'
      ? `<p style="color:var(--ink-soft); margin:0; line-height:1.6;">${message}</p>`
      : message,
    actions: [
      { label: cancelLabel || 'Cancel', variant: 'btn--ghost' },
      {
        label: confirmLabel || 'Confirm',
        variant: danger ? 'btn--danger' : 'btn--primary',
        onClick: () => { if (onConfirm) onConfirm(); },
      },
    ],
  });
}
