const LinkModal = {
    isOpen: false,
    linkType: 'url',
    urlValue: '',
    slideValue: '',
    currentLink: '',
    onSave: null,

    init() {
        const modal = document.getElementById('link-modal');
        if (!modal) return;

        modal.querySelectorAll('.modal-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.linkType = tab.dataset.tab;
                document.getElementById('tab-url').classList.toggle('hidden', this.linkType !== 'url');
                document.getElementById('tab-slide').classList.toggle('hidden', this.linkType !== 'slide');
            });
        });

        document.getElementById('btn-cancel-link')?.addEventListener('click', () => this.close());
        document.getElementById('btn-save-link')?.addEventListener('click', () => this.save());
    },

    open(link, onSave) {
        this.currentLink = link || '';
        this.onSave = onSave;
        this.isOpen = true;

        if (link && link.startsWith('slide://')) {
            this.linkType = 'slide';
            this.slideValue = link.replace('slide://', '');
        } else {
            this.linkType = 'url';
            this.urlValue = link || '';
        }

        const modal = document.getElementById('link-modal');
        modal.classList.remove('hidden');
        modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        modal.querySelector(`.modal-tab[data-tab="${this.linkType}"]`)?.classList.add('active');
        document.getElementById('tab-url').classList.toggle('hidden', this.linkType !== 'url');
        document.getElementById('tab-slide').classList.toggle('hidden', this.linkType !== 'slide');

        document.getElementById('link-url').value = this.urlValue;
        this.updateSlideSelect();
    },

    close() {
        this.isOpen = false;
        document.getElementById('link-modal')?.classList.add('hidden');
    },

    updateSlideSelect() {
        const select = document.getElementById('link-slide');
        if (!select || !window.editor) return;
        const state = window.editor.store.getState();
        select.innerHTML = state.presentation.slides.map((slide, index) => 
            `<option value="${slide.id}" ${slide.id === this.slideValue ? 'selected' : ''}>幻灯片 ${index + 1}</option>`
        ).join('');
    },

    save() {
        const value = this.linkType === 'url' 
            ? document.getElementById('link-url').value 
            : `slide://${document.getElementById('link-slide').value}`;
        if (this.onSave) this.onSave(value);
        this.close();
    }
};

window.LinkModal = LinkModal;
