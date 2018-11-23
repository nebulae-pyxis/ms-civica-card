const assert = require('assert');
const expect = require('chai').expect
const uuidv4 = require('uuid/v4');
const Rx = require('rxjs');
const {
    tap,
    switchMap,
    delay,
    filter,
    map,
    first,
    mapTo,
    mergeMap,
    concatMap,
    catchError
} = require('rxjs/operators');

const MqttBroker = require('../../../node_modules/@nebulae/event-store/lib/broker/MqttBroker');
const mqttBroker = new MqttBroker({ eventsTopic: 'Events', brokerUrl: 'mqtt://localhost:1883' });

const Reader = require('./Reader');
const KeyCloak = require('./KeyCloak');
const GraphQL = require('./GraphQL');
const Conversation = require('./Conversation');
const CivicaReloader = require('./CivicaReloader');


const reader = new Reader();
const keyCloak = new KeyCloak();
const graphQL = new GraphQL();
/**
 * @type {Conversation}
 */
let conversation;
/**
 * @type {CivicaReloader}
 */
let civicaReloader;


const logError = (error) => {
    if (!error.stack) {
        console.error(error);
    }
    const stackLines = error.stack.split('\n');
    console.error(
        stackLines[0] + '\n' + stackLines.filter(line => line.includes('civica-card/bin')).join('\n') + '\n'
    );
};

const getRxDefaultSubscription = (evtText, done) => {
    return [
        (evt) => console.log(`${evtText}: ${evt}`),
        (error) => { done(error); logError(error) },
        () => done()
    ];
};


describe('Full Cycle Test', function () {

    describe('Prepare', function () {
        it('connect hardware and servers', function (done) {
            this.timeout(5000);
            Rx.merge(
                reader.connect$().pipe(
                    mergeMap((readerEvt) => reader.detectCard$().pipe(map(cardEvt => `${readerEvt}  -> ${cardEvt}`)))
                ),
                keyCloak.logIn$().pipe(
                    tap(jwtEvt => graphQL.jwt = keyCloak.jwt),
                    mergeMap(jwtEvt => graphQL.connect$()),
                    mergeMap(() => graphQL.testConnection$())
                ),
                mqttBroker.start$()

            ).subscribe(...getRxDefaultSubscription('Prepare:connect hardware and servers', done));
        });
    });

    describe('Civica Card Reload Conversation', function () {
        it('Create & retrieve conversation', function (done) {
            this.timeout(5000);
            conversation = new Conversation(graphQL, reader.readerTpe, reader.cardType, reader.cardUid, mqttBroker);
            conversation.startConversation$().pipe(
                mergeMap(createdConversation => {
                    return conversation.queryConversation$(createdConversation.id).pipe(
                        tap(retrievedConversation => expect(retrievedConversation).to.be.deep.equals(createdConversation))
                    )
                })
            ).subscribe(...getRxDefaultSubscription('Civica Card Reload Conversation:Create & retrieve conversation', done));
        });
        it('Retrieve fake conversation', function (done) {
            this.timeout(5000);            
            conversation.queryConversation$('fake-id').pipe(
                catchError(error => Rx.of(error.message.code)),
                tap(errorCode => expect(errorCode).to.be.eq(18014))
            ).subscribe(...getRxDefaultSubscription('Civica Card Reload Conversation:Retrieve fake conversation', done));
        });
    });

    describe('Civica Card Reload', function () {
        it('Read Civica Card', function (done) {
            this.timeout(5000);
            civicaReloader = new CivicaReloader(conversation,reader,graphQL);            
            civicaReloader.readCivicaCard$().pipe(
                tap(x => {})    
            ).subscribe(...getRxDefaultSubscription('Civica Card Reload Conversation:Read Civica Card', done));
        });        
    });













    describe('De-Prepare', function () {
        it('disconnects hardware and servers', function (done) {
            this.timeout(5000);
            Rx.merge(
                reader.disconnect$(),
                keyCloak.logOut$(),
                graphQL.disconnect$()
            ).subscribe(...getRxDefaultSubscription('De-Prepare:disconnect hardware and servers', done));
        });
    });





})