// The same result card serves as a modal for a fresh finish and as an inline record.
export function createPuzzleFinale(section) {
  const card = section.querySelector('#puzzle-result');
  const title = card.querySelector('#puzzle-result-title');
  const stars = card.querySelector('#puzzle-stars');
  const reopen = section.querySelector('#puzzle-reopen-result');
  const placeholder = document.createComment('puzzle result');
  const dialog = document.createElement('dialog');
  dialog.className = 'puzzle-finale';
  dialog.setAttribute('aria-labelledby', title.id);
  card.before(placeholder, dialog);

  const tools = document.createElement('div');
  tools.className = 'puzzle-finale-tools';
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = '연출 건너뛰기';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '닫기';
  tools.append(skip, close);

  function skipAnimation() {
    dialog.classList.remove('is-celebrating');
    skip.hidden = true;
  }

  function dismiss(restoreFocus = false) {
    if (!dialog.open) return;
    dialog.close();
    placeholder.after(card);
    tools.remove();
    skipAnimation();
    if (restoreFocus && !section.hidden && !reopen.hidden) {
      reopen.focus({preventScroll: true});
    }
  }

  function open(celebrate = false) {
    if (dialog.open || card.hidden || section.hidden || document.hidden) return;
    if (!dialog.showModal) {
      card.scrollIntoView({block: 'nearest'});
      title.focus({preventScroll: true});
      return;
    }
    dialog.append(card);
    card.prepend(tools);
    const animate = celebrate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    skip.hidden = !animate;
    dialog.classList.toggle('is-celebrating', animate);
    dialog.showModal();
    title.focus({preventScroll: true});
  }

  function setStars(symbols, label) {
    if (!/^[★☆]+$/.test(symbols)) {
      stars.removeAttribute('role');
      stars.removeAttribute('aria-label');
      stars.textContent = symbols;
      return;
    }
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', label);
    stars.replaceChildren(...Array.from(symbols, (symbol, index) => {
      const star = document.createElement('span');
      star.className = symbol === '★' ? 'earned-star' : 'empty-star';
      star.style.setProperty('--star-index', index);
      star.setAttribute('aria-hidden', 'true');
      star.textContent = symbol;
      return star;
    }));
  }

  skip.addEventListener('click', () => {
    skipAnimation();
    title.focus({preventScroll: true});
  });
  close.addEventListener('click', () => dismiss(true));
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    dismiss(true);
  });
  dialog.addEventListener('animationend', event => {
    if (event.animationName === 'puzzle-finale-arrive' && !skip.hidden) {
      if (document.activeElement === skip) title.focus({preventScroll: true});
      skip.hidden = true;
    }
  });
  reopen.addEventListener('click', () => open());
  window.addEventListener('hashchange', () => dismiss());
  return {open, dismiss, setStars};
}
