'use strict'
const CivicaCardReloadConversationDA = require("../../data/CivicaCardReloadConversationDA");
const Rx = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const { CustomError, ENTITY_NOT_FOUND_ERROR_CODE } = require('../../tools/customError');
const { SamClusterClient, Compiler, BytecodeMifareBindTools } = require('../../tools/mifare/');
const CivicaCardReadWriteFlow = require('./CivicaCardReadWriteFlow');
const { getSamAuthKeyAndDiversifiedKey } = require('./CivicaCardTools');
const CivicaCardDataExtractor = require('./CivicaCardDataExtractor');
const CivicaCardReload = require('./CivicaCardReload');


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
            this.bytecodeCompiler = new Compiler(this.samClusterClient);
            this.bytecodeMifareBindTools = new BytecodeMifareBindTools();
            observer.next(`samClusterClient connected to ${mqttServerUrl}`);
            observer.complete();
        });
    }

    /**
     * Creates and returns a CivicaCardReloadConversation
     */
    startCivicaCardReloadConversation$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.create$({ ...args, userJwt: jwt, userName: authToken.name, businessId: authToken.businessId })
            .pipe(
                tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.id})`, ENTITY_NOT_FOUND_ERROR_CODE) }),
                map(conversation => this.formatCivicaCardReloadConversationToGraphQLSchema(conversation)),
                mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
                catchError(error => {
                    console.error(error.stack || error);
                    return GraphqlResponseTools.handleError$(error);
                })
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
                catchError(error => {
                    //console.error(error.stack || error);
                    return GraphqlResponseTools.handleError$(error);
                })
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
            posLocation: conversation.pos.location.geometry.coordinates,
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
                const { key, dataDiv } = getSamAuthKeyAndDiversifiedKey(args.cardRole, conversation.cardUid, this.samClusterClient);
                return this.samClusterClient.requestSamFirstStepAuth$(
                    { dataDiv, key, cardFirstSteptAuthChallenge: args.cardChallenge }, { transactionId: conversation._id })
                    .pipe(map(samFirstStepAuthResponse => ({ samFirstStepAuthResponse, conversation })));
            }
            ),
            mergeMap(({ samFirstStepAuthResponse, conversation }) => {
                return CivicaCardReloadConversationDA.setSamId$(conversation._id, samFirstStepAuthResponse.samId)
                    .pipe(mapTo(samFirstStepAuthResponse))
            }),
            map(samFirstStepAuthResponse => ({ token: samFirstStepAuthResponse.secondStepSamToken.toString('hex') })),
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(error => {
                console.error(error.stack || error);
                return GraphqlResponseTools.handleError$(error);
            })
        );
    }


    /**
     * Generates binary commands sequence to read a civica card
     */
    generateCivicaCardReloadReadApduCommands$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.find$(args.conversationId)
            .pipe(
                tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.conversationId})`, ENTITY_NOT_FOUND_ERROR_CODE) }),
                map(conversation => (
                    {
                        conversation,
                        bytecode: CivicaCardReadWriteFlow.generateReadBytecode(conversation.cardType, args.dataType)
                    }
                )),
                mergeMap(({ conversation, bytecode }) => this.bytecodeCompiler.compile$(bytecode, conversation.cardType, conversation.readerType, { conversation, cardSecondStepAuthConfirmation: args.cardAuthConfirmationToken })),
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
        return CivicaCardReloadConversationDA.find$(args.conversationId)
            .pipe(
                tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.conversationId})`, ENTITY_NOT_FOUND_ERROR_CODE) }),
                mergeMap(conversation =>
                    this.bytecodeCompiler.decompileResponses$(args.commands, conversation.cardType, conversation.readerType, { conversation }).pipe(map(bytecode => ({ bytecode, conversation })))
                ),
                mergeMap(({ bytecode, conversation }) => this.bytecodeMifareBindTools.applyBytecodeToMifareCard$(bytecode, conversation.initialCard.rawData).pipe(map(mifareCard => ({ conversation, mifareCard })))),
                mergeMap(({ conversation, mifareCard }) =>
                    CivicaCardReloadConversationDA.setInitialCardRawData$(conversation._id, mifareCard).pipe(
                        mergeMap(mifareCard => CivicaCardDataExtractor.extractCivicaData$(mifareCard)),
                        mergeMap(civicaData => CivicaCardReloadConversationDA.setInitialCardCivicaData$(conversation._id, civicaData))
                    )),
                mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse))
            ).pipe(
                catchError(error => {
                    console.error(error.stack || error);
                    return GraphqlResponseTools.handleError$(error);
                })
            );
    }






    /**
     * Tries to generate the purchase itself
     * @param {*} param0 
     * @param {*} authToken 
     */
    purchaseCivicaCardReload$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.find$(args.conversationId).pipe(
            tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.id})`, ENTITY_NOT_FOUND_ERROR_CODE) }),            
            mergeMap(conversation => CivicaCardReload.purchaseCivicaCardReload$(conversation,args.value)),
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(error => {
                console.error(error.stack || error);
                return GraphqlResponseTools.handleError$(error);
            })
        );
    }


    generateCivicaCardReloadWriteAndReadApduCommands$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.find$(args.conversationId).pipe(
            tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.id})`, ENTITY_NOT_FOUND_ERROR_CODE) }),            

            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(error => {
                console.error(error.stack || error);
                return GraphqlResponseTools.handleError$(error);
            })
        );
    }

    processCivicaCardReloadWriteAndReadApduCommandResponses$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.find$(args.conversationId).pipe(
            tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.id})`, ENTITY_NOT_FOUND_ERROR_CODE) }),            

            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(error => {
                console.error(error.stack || error);
                return GraphqlResponseTools.handleError$(error);
            })
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