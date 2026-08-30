# HelpDesk
**Programmazione Web e Mobile con Laboratorio**\
Bonelli Pietro - A.A. 2025/26

## Descrizione del progetto
Il progetto consiste in un **Helpdesk**, all'interno del quale gli utenti possono **registrarsi** per accedere ad una serie di funzionalità.\
Il caso d'uso pensato è per tutte quelle aziende/imprese che offrono servizi e che necessitano di uno strumento con il quale i clienti possano mettersi in contatto in modo semplice e veloce per ricevere aiuto in caso di problemi o qualsiasi necessità.

## Specifiche Funzionali
Tutto il progetto ruota attorno alla creazione e gestione di **Ticket** da parte degli utenti.\
Il sistema è strutturato per **Categorie** e **Sotto-Categorie**. Ogni ticket deve essere associato ad una Categoria al momento della creazione. Le categorie possono essere gestite in maniera flessibile attraverso il **Pannello Admin**.\
Ogni operatore è a sua volta associato ad una o più categorie, ed ha diritto a gestire solo ed esclusivamente i Ticket di sua competenza. Anche questo aspetto è completamente gestibile attraverso il **Pannello Admin**.\
In ultimo, gli **Amministratori** del sistema, tramite il medesimo pannello, hanno completo accesso a tutte le funzionalità di gestione degli **Utenti** (operatori e non).

### Funzionalità Utente
Ogni utente, una volta effettuato il **Login**, ha accesso alla sua **Dashboard** (la sua area personale). In questa pagina potrà visualizzare la lista dei **Ticket** (richieste di supporto) creati in passato o crearne di nuovi.\
Questa pagina, come maggior parte delle altre pagine, è corredata da una serie di funzionalità che migliorano la **User Experience**.

Una volta creato un ticket, si potrà accedere all'interfaccia **Chat** del ticket stesso, nella quale l'utente avrà la possibilità di parlare in **real-time** con un operatore. Il sistema supporta l'inserimento di **testo formattato** all'interno dei messaggi.

Una volta concluse le attività di supporto, l'utente potrà, se lo desidera, lasciare una **valutazione** (tra 1 e 5 stelle) e un commento all'operatore che lo ha aiutato, utile poi per generare dei report sul gradimento generale e/o specifico di ogni dipendente.

### Funzionalità Operatore
Ogni operatore del sistema ha la possibilità di accedere al suo **Pannello Operatore**, all'interno del quale potrà visualizzare e accedere a tutti i **Ticket** creati per una delle categorie da lui gestite.\
Una volta preso in carico un ticket, sarà lui l'incaricato della risoluzione dello stesso. Ciò nonostante, qualsiasi operatore avente diritto alla gestione del ticket (in base alle categorie gestite) avrà la possibilità di visualizzare i messaggi e intervenire nella conversazione, qualora fosse necessario.\
All'interno dell'interfaccia **Chat** di un ticket, gli operatori hanno la possibilità di inserire delle **Note Private** che potranno essere visualizzate solo da altri operatori (non dall'utente che ha creato il ticket).

### Funzionalità Admin
Gli **Amministratori del Sistema** hanno accesso ad una serie di funzionalità extra rispetto ai classici operatori.\
In primo luogo, hanno automaticamente accesso alla visualizzazione e gestione di **tutte le categorie** di ticket, senza bisogno esplicito di specificarle.\
Le funzionalità principali si sviluppano tutte nel **Pannello Admin**, attraverso il quale gli amministratori possono:
- Gestire gli **Utenti** del sistema, modificando Nome/Cognome/Email e soprattutto Ruolo (per renderli Operatori);
- Gestire le **Categorie** e **Sotto-Categorie**;
- Gestire i **Ruoli** e le categorie ad essi associate;
- Generare **Report Statistici** per analizzare il gradimento e il corretto funzionamento del sistema.

## Istruzioni per l'uso
1. Scaricare il progetto o clonare il repository github
2. Rinominare `.env.dist` in `.env` e inserire le configurazioni appropriate
3. Eseguire `npm install` per installare tutte le dipendenze necessarie
4. Eseguire il codice SQL contenuto in `db/schema.sql` nel database specificato al punto 2.
5. Eseguire `npm start` per avviare il server, verificare la corretta connessione al database e la corretta esecuzione del server
6. Aprire la pagina web all'indirizzo e porta specificati al punto 2 ed effettuare la **Registrazione**. Il primo utente registrato sarà automaticamente impostato come **Admin**.