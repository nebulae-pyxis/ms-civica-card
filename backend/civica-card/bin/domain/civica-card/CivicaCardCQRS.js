'use strict'
const CivicaCardReloadConversationDA = require("../../data/CivicaCardReloadConversationDA");
const Rx = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const { CustomError, ENTITY_NOT_FOUND_ERROR_CODE } = require('../../tools/customError');
const {SamClusterClient,BytecodeCompiler,CivicaCardReadWriteFlow} = require('../../tools/mifare/');

/**
 * Singleton instance
 */
let instance;

class CivicaCardCQRS {

    constructor() {
    }

    start$() {
        return Rx.Observable.create(observer => {
            const mqttServerUrl = process.env.SAM_CLUSTER_MQTT_CONN_STR;
            const appId = `civica-card_be_civicacardcqrs_${(Math.floor(Math.random() * Math.floor(100)))}`
            this.samClusterClient = new SamClusterClient({ mqttServerUrl, replyTimeout: 2000, appId });
            this.bytecodeCompiler = new BytecodeCompiler(this.samClusterClient);
            observer.next(`samClusterClient connected to ${mqttServerUrl}`);
            observer.complete();
        });
    }

    /**
     * Creates and returns a CivicaCardReloadConversation
     */
    startCivicaCardReloadConversation$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.create$({ ...args, userJwt: jwt, userName: authToken.name })
            .pipe(
                tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.id})`, ENTITY_NOT_FOUND_ERROR_CODE) }),
                map(conversation => this.formatCivicaCardReloadConversationToGraphQLSchema(conversation)),
                mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
                catchError(error => GraphqlResponseTools.handleError$(error))
            );
    }


    /**
     * Finds a CivicaCardReloadConversation by its ID, format it to the graphql schema and returns it
     */
    getCivicaCardReloadConversation$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.find$(args.id)
            .pipe(
                tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.id})`, ENTITY_NOT_FOUND_ERROR_CODE) }),
                map(conversation => this.formatCivicaCardReloadConversationToGraphQLSchema(conversation)),
                mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
                catchError(error => GraphqlResponseTools.handleError$(error))
            );
    }


    /**
     * Fromats CivicaCardReloadConversation to the GraphQL schema 
     * @param Object conversation 
     */
    formatCivicaCardReloadConversationToGraphQLSchema(conversation) {
        return {
            id: conversation._id,
            userJwt: conversation.user.jwt,
            userName: conversation.user.name,
            posId: conversation.pos.id,
            posUser: conversation.pos.user,
            posTerminal: conversation.pos.terminal,
            posLocation: conversation.pos.location,
            readerType: conversation.readerType,
            cardType: conversation.cardType,
            cardUid: conversation.cardUid
        };
    }



    /**
    * generates CivicaCard SecondAuthToken using the SAM cluster
    */
    generateCivicaCardReloadSecondAuthToken$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.find$(args.conversationId).pipe(
            tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.id})`, ENTITY_NOT_FOUND_ERROR_CODE) }),
            mergeMap(conversation => {
                return this.samClusterClient.requestSamFirstStepAuth$(
                    { uid: conversation.cardUid, cardFirstSteptAuthChallenge: args.cardChallenge },
                    { transactionId: conversation._id },
                    args.cardRole == 'DEBIT' ? this.samClusterClient.KEY_DEBIT : args.cardRole == 'CREDIT' ? this.samClusterClient.KEY_CREDIT : args.cardRole == 'PUBLIC' ? this.samClusterClient.KEY_PUBLIC : 0)
                    .pipe(map(samFirstStepAuthResponse => ({ samFirstStepAuthResponse, conversation })));
            }
            ),
            mergeMap(({ samFirstStepAuthResponse, conversation }) => {
                return CivicaCardReloadConversationDA.setSamId$(conversation._id, samFirstStepAuthResponse.samId)
                    .pipe(mapTo(samFirstStepAuthResponse))
            }),
            map(samFirstStepAuthResponse => ({ token: samFirstStepAuthResponse.secondStepSamToken.toString('hex') })),
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(error => GraphqlResponseTools.handleError$(error))
        );
    }


    /**
     * Generates binary commands sequence to read a civica card
     */
    generateCivicaCardReloadReadApduCommands$({ root, args, jwt }, authToken) {
        console.log(`generateCivicaCardReloadReadApduCommands: ${JSON.stringify(args)}`);
        return CivicaCardReloadConversationDA.find$(args.conversationId)
            .pipe(
                tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.conversationId})`, ENTITY_NOT_FOUND_ERROR_CODE) }),
                map(conversation => (
                    {
                        conversation,
                        bytecode: CivicaCardReadWriteFlow.generateReadBytecode(conversation.cardType, args.dataType)
                    }
                )),
                mergeMap( ({conversation,bytecode}) => this.bytecodeCompiler.compile$(bytecode,conversation.cardType,conversation.readerType , { conversation, cardSecondStepAuthConfirmation: args.cardAuthConfirmationToken } )),
                mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
                catchError(error => {
                    console.error(error.stack || error);
                    return GraphqlResponseTools.handleError$(error);
                })
            );
    }









    /**
     * process and translate binary commands respone sequence to infer civica card data
     */
    processCivicaCardReloadReadApduCommandRespones$({ root, args, jwt }, authToken) {
        console.log(`processCivicaCardReloadReadApduCommandRespones: ${JSON.stringify(args)}`);
        return CivicaCardReloadConversationDA.find$(args.conversationId)
            .pipe(
                tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.conversationId})`, ENTITY_NOT_FOUND_ERROR_CODE) }),
                map(c => ({})),
                mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
                catchError(error => GraphqlResponseTools.handleError$(error))
            );
    }




}




/**
 * @returns {CivicaCardCQRS}
 */
module.exports = () => {
    if (!instance) {
        instance = new CivicaCardCQRS();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};