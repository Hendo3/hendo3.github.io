export function getSuggestions(value, state) {
    const text = value.trimStart();
    if (!text) return [];
    const words = text.split(/\s+/);
    const first = words[0].toLowerCase();
    const option = (value, label = value) => ({ value, label });
    let options = [];
    if (words.length === 1) {
        options = state.commands.flatMap((entry) => entry.command.map((name) =>
            option(name + (['export', 'import', 'help', 'aliases', 'clear', 'cls', 'clearlinks', 'cl'].includes(name) ? '' : ' '), `${name} — ${entry.description}`)));
        options.push(...Object.keys(state.aliases).map((name) => option(name + ' ', `${name} — ${state.aliases[name]}`)));
    } else if (first === 'sector') {
        if (words.length === 2) {
            options = ['list', 'add', 'rename', 'move', 'remove'].map((name) => option(`sector ${name}${name === 'list' ? '' : ' '}`));
        } else if (['rename', 'move', 'remove'].includes(words[1]) && words.length === 3) {
            options = state.sectors.map((sector) => option(`sector ${words[1]} ${sector.id}${words[1] === 'rename' ? ' | ' : ' '}`, `${sector.id} — ${sector.label}`));
        } else if (words[1] === 'remove' && words.length === 4) {
            options = state.sectors.filter((sector) => sector.id !== words[2]).map((sector) => option(`sector remove ${words[2]} ${sector.id}`, `Move links to ${sector.label}`));
        } else if (words[1] === 'move' && words.length === 4) {
            options = state.sectors.map((_, index) => option(`sector move ${words[2]} ${index + 1}`));
        }
    } else if (['add', 'list', 'ls'].includes(first) && words.length === 2) {
        options = state.sectors.map((sector) => option(`${first} ${sector.id}${first === 'add' ? ' | ' : ''}`, `${sector.id} — ${sector.label}`));
    } else if (['edit', 'remove', 'rm'].includes(first) && !text.includes('|')) {
        const query = text.slice(first.length).trim().toLowerCase();
        return state.links.filter((link) => link.id.toLowerCase().startsWith(query) || link.label.toLowerCase().startsWith(query))
            .slice(0, 8).map((link) => option(`${first} ${link.id}${first === 'edit' ? ' | ' : ''}`, `${link.label} [${link.id}]`));
    } else if (first === 'unalias' && words.length === 2) {
        options = Object.keys(state.aliases).map((name) => option(`unalias ${name}`));
    }
    return options.filter((entry) => entry.value.toLowerCase().startsWith(text.toLowerCase())).slice(0, 8);
}

export function installAutocomplete(input, getState) {
    const list = document.createElement('ul');
    list.id = 'command-suggestions';
    list.hidden = true;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Command suggestions');
    input.parentElement.appendChild(list);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', list.id);
    input.setAttribute('aria-expanded', 'false');
    let options = [];
    let selected = -1;
    const close = () => {
        list.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        selected = -1;
    };
    const highlight = () => {
        [...list.children].forEach((item, index) => item.setAttribute('aria-selected', String(index === selected)));
        if (selected >= 0) {
            input.setAttribute('aria-activedescendant', list.children[selected].id);
            list.children[selected].scrollIntoView({ block: 'nearest' });
        }
    };
    const accept = (index) => {
        if (!options[index]) return;
        input.value = options[index].value;
        close();
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    };
    const update = () => {
        options = getSuggestions(input.value, getState());
        selected = -1;
        list.replaceChildren();
        input.removeAttribute('aria-activedescendant');
        options.forEach((entry, index) => {
            const item = document.createElement('li');
            item.id = `suggestion-${index}`;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', 'false');
            item.textContent = entry.label;
            item.addEventListener('pointerdown', (event) => { event.preventDefault(); accept(index); });
            list.appendChild(item);
        });
        list.hidden = !options.length;
        input.setAttribute('aria-expanded', String(!!options.length));
    };
    input.addEventListener('input', update);
    input.addEventListener('blur', close);
    input.addEventListener('keydown', (event) => {
        if (event.isComposing) return;
        if (event.key === 'Escape') { close(); return; }
        if (list.hidden && ['Tab', 'ArrowDown'].includes(event.key)) update();
        if (list.hidden) return;
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
            highlight();
        } else if (event.key === 'Tab' || (event.key === 'Enter' && selected >= 0)) {
            event.preventDefault();
            accept(selected < 0 ? 0 : selected);
        } else if (event.key === 'Enter') close();
    }, true);
}
