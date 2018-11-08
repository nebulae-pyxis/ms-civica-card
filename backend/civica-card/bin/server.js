'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const mongoDB = require('./data/MongoDB').singleton();
const CivicaCardReloadConversationDA = require('./data/CivicaCardReloadConversationDA');
const graphQlService = require('./services/sales-gateway/GraphQlService')();
const {civicaCardCQRS} = require('./domain/civica-card/');
const Rx = require('rxjs');

const start = () => {
    Rx.concat(
        eventSourcing.eventStore.start$(),
        eventStoreService.start$(),
        mongoDB.start$(),
        CivicaCardReloadConversationDA.start$(),
        graphQlService.start$(),
        civicaCardCQRS.start$()
    ).subscribe(
        (evt) => {
            // console.log(evt)
        },
        (error) => {
            console.error('Failed to start', error);
            process.exit(1);
        },
        () => console.log('civica-card started')
    );
};

start();



