class InfiniteScroll {
    /**
     * @param {HTMLElement} triggerElement
     * @param {Function} loadDataCallback
     * @param {Object} options
     */
    constructor(triggerElement, loadDataCallback, options = {}) {
        this.trigger = triggerElement;
        this.loadData = loadDataCallback;

        this.page = 0;
        this.isLoading = false;
        this.hasMore = true;

        const observerOptions = {
            root: options.root || null,
            rootMargin: options.rootMargin || '100px',
            threshold: 0
        };

        this.observer = new IntersectionObserver(this.handleIntersection.bind(this), observerOptions);

        this.observer.observe(this.trigger);
    }

    async handleIntersection(entries) {
        const target = entries[0];

        // Se ci sono altri da caricare e non sta già caricando
        if (target.isIntersecting && !this.isLoading && this.hasMore)
            await this.loadNext();
    }

    async loadNext() {
        this.isLoading = true;
        this.page++;

        try {
            // Esegue funzione personalizzata
            this.hasMore = await this.loadData(this.page);

            // Non ci sono più elementi
            if (!this.hasMore) {
                this.observer.disconnect();
                this.trigger.style.display = 'none';
            }
        } catch (error) {
            console.error(error);
            this.page--;
        } finally {
            this.isLoading = false;

            // Forzo un ricaricamento per evitare che non si triggeri se sono già sopra lo spinner
            this.observer.unobserve(this.trigger);
            this.observer.observe(this.trigger);
        }
    }

    reset() {
        this.page = 1;
        this.hasMore = true;
        this.isLoading = false;
        this.trigger.style.display = 'block';

        this.observer.disconnect();
        this.observer.observe(this.trigger);
    }
}