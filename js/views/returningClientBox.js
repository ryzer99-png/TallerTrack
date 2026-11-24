import { findReturningClients } from '../services/clientesService.js';
import { escapeHtml, showToast } from '../utils.js';

/** Conecta la búsqueda debounced de clientes frecuentes al escribir nombre o teléfono. */
export function bindReturningClientLookup({ container, clientNameInput, clientPhoneInput, eqInput, onEquipmentPicked }) {
  const returningBox = container.querySelector('#returning-client-suggestions');
  let timer = null;

  function clearBox() {
    returningBox.classList.add('hidden');
    returningBox.innerHTML = '';
  }

  function scheduleLookup(rawValue) {
    clearTimeout(timer);
    const val = String(rawValue || '').trim();
    if (val.length < 3) return clearBox();

    timer = setTimeout(async () => {
      try {
        const matches = await findReturningClients(val);
        if (!matches.length) return clearBox();

        returningBox.classList.remove('hidden');
        returningBox.innerHTML = `
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-extrabold uppercase tracking-wider text-blue-800">Clientes registrados (1 toque para autocompletar)</span>
            <button id="close-returning-box" type="button" class="min-w-[44px] min-h-[44px] flex items-center justify-center text-sm font-bold text-slate-500 hover:text-slate-800" aria-label="Cerrar sugerencias">✕</button>
          </div>
          <div class="flex flex-col gap-2">
            ${matches.map((c, idx) => `
              <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/80">
                <button type="button" data-pick-client="${idx}" class="text-left flex-1 min-w-0 min-h-[44px] flex flex-col justify-center">
                  <span class="font-bold text-sm text-slate-900 block truncate">${escapeHtml(c.nombre)}</span>
                  <span class="font-mono text-xs text-slate-600">${escapeHtml(c.telefono)} · ${c.totalOrdenes} servicio(s)</span>
                </button>
                ${c.equipos.length > 0 ? `
                  <div class="flex flex-wrap gap-1.5">
                    ${c.equipos.slice(0, 3).map((eq) => `
                      <button type="button" data-pick-client-eq="${idx}" data-eq-name="${escapeHtml(eq)}" class="touch-chip px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold">+ ${escapeHtml(eq)}</button>
                    `).join('')}
                  </div>` : ''}
              </div>`).join('')}
          </div>
        `;

        returningBox.querySelector('#close-returning-box')?.addEventListener('click', () => returningBox.classList.add('hidden'));
        returningBox.querySelectorAll('[data-pick-client]').forEach((btn) =>
          btn.addEventListener('click', () => {
            const picked = matches[Number(btn.dataset.pickClient)];
            if (!picked) return;
            clientNameInput.value = picked.nombre;
            clientPhoneInput.value = picked.telefono;
            clearBox();
            showToast(`Cliente "${picked.nombre}" cargado`);
          })
        );
        returningBox.querySelectorAll('[data-pick-client-eq]').forEach((btn) =>
          btn.addEventListener('click', () => {
            const picked = matches[Number(btn.dataset.pickClientEq)];
            if (!picked) return;
            clientNameInput.value = picked.nombre;
            clientPhoneInput.value = picked.telefono;
            eqInput.value = btn.dataset.eqName || '';
            onEquipmentPicked?.();
            clearBox();
            showToast(`Cliente y equipo "${eqInput.value}" cargados`);
          })
        );
      } catch {
        clearBox();
      }
    }, 240);
  }

  clientNameInput.addEventListener('input', (e) => scheduleLookup(e.target.value));
  clientPhoneInput.addEventListener('input', (e) => scheduleLookup(e.target.value));

  return { clearBox };
}
