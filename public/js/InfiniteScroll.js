class InfiniteScroll {

    /**
     * 
     * @param {HTMLElement} triggerElement elemento da osservare 
     * @param {*} loadDataCallback funzione callback da eseguire (fetch). Deve restituire una Promise (true = ci sono altri dati, false = non ci sono altri dati)
     * @param {*} options 
     */
    constructor(triggerElement, loadDataCallback, options = {}) {
        this.trigger = triggerElement;
        this.loadData = loadDataCallback;

        this.page = 0;
        this.isLoading = false; // per evitare di far partire più chiamate contemporaneamente
        this.hasMore = true;

        const observerOptions = {
            root: options.root || null,
            rootMargin: options.rootMargin || '100px',
            threshold: 0
        };

        // Sfrutto l'API nativa dei Browser (IntersectionObserver) per evitare di appesantire la pagina controllando l'evento di scroll
        // Si "triggera" quando l'elemento entra nella viewport dell'utente, in modo asincrono.
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
            // Esegue funzione personalizzata (fetch)
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