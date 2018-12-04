'use strict'

const Rx = require("rxjs");
const { of } = require('rxjs');
const { tap, mergeMap, catchError, map, mapTo, toArray } = require('rxjs/operators');
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const RoleValidator = require("../../tools/RoleValidator");
const { CustomError, PERMISSION_DENIED, CONVERSATION_NOT_FOUND, BUSINESS_NOT_FOUND, BUSINESS_NOT_ACTIVE, BUSINESS_WALLET_NOT_FOUND, BUSINESS_WALLET_SPENDING_FORBIDDEN } = require('../../tools/customError');
const { SamClusterClient, Compiler, BytecodeMifareBindTools } = require('../../tools/mifare/');
const CivicaCardReadWriteFlow = require('./CivicaCardReadWriteFlow');
const { getSamAuthKeyAndDiversifiedKey } = require('./CivicaCardTools');
const CivicaCardDataExtractor = require('./CivicaCardDataExtractor');
const CivicaCardReload = require('./CivicaCardReload');
const CivicaCardReloadDA = require("../../data/CivicaCardReloadDA");
const CivicaCardReloadConversationDA = require("../../data/CivicaCardReloadConversationDA");
const BusinessDA = require("../../data/BusinessDA");

/**
 * Singleton instance
 */
let instance;

class CivicaCardCQRS {

    //#region CONSTRUCTOR + START SEQUENCE    
    constructor() {
    }

    /**
     * Prepares this class to be ready to handle requests
     */
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
    //#endregion

    //#region Conversation

    /**
     * Creates and returns a CivicaCardReloadConversation
     */
    startCivicaCardReloadConversation$({ root, args, jwt }, authToken) {
        return this.verifyBusiness$(authToken.businessId, undefined).pipe(
            mergeMap(() => CivicaCardReloadConversationDA.create$({ ...args, userJwt: jwt, userName: authToken.name, businessId: authToken.businessId })),
            map(conversation => this.formatCivicaCardReloadConversationToGraphQLSchema(conversation)),
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(error => {
                this.logError(error);
                return GraphqlResponseTools.handleError$(error);
            })
        );
    }


    /**
     * Finds a CivicaCardReloadConversation by its ID, format it to the graphql schema and returns it
     */
    setCivicaCardReloadConversationUiState$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.setUiState$(args.conversationId, args.uiState)
            .pipe(
                map(oldConversation => oldConversation.uiState),
                mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
                catchError(error => {
                    this.logError(error);
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
                map(conversation => this.formatCivicaCardReloadConversationToGraphQLSchema(conversation)),
                mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
                catchError(error => {
                    this.logError(error);
                    return GraphqlResponseTools.handleError$(error);
                })
            );
    }

    //#endregion

    //#region CIVICA CART AUTH

    /**
    * generates CivicaCard SecondAuthToken using the SAM cluster
    */
    generateCivicaCardReloadSecondAuthToken$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.find$(args.conversationId).pipe(
            mergeMap(conversation => {
                const { key, dataDiv } = getSamAuthKeyAndDiversifiedKey(args.cardRole, conversation.cardUid, this.samClusterClient);
                return this.samClusterClient.requestSamFirstStepAuth$(
                    { dataDiv, key, cardFirstSteptAuthChallenge: args.cardChallenge }, { transactionId: conversation._id })
                    .pipe(map(samFirstStepAuthResponse => ({ samFirstStepAuthResponse, conversation })));
            }
            ),
            mergeMap(({ samFirstStepAuthResponse, conversation }) => {
                return CivicaCardReloadConversationDA.setSamIdSamKeyAndCardRole$(conversation._id, samFirstStepAuthResponse.samId, samFirstStepAuthResponse.samKey, args.cardRole)
                    .pipe(mapTo(samFirstStepAuthResponse))
            }),
            map(samFirstStepAuthResponse => ({ token: samFirstStepAuthResponse.secondStepSamToken.toString('hex') })),
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(error => {
                this.logError(error);
                return GraphqlResponseTools.handleError$(error);
            })
        );
    }

    //#endregion

    //#region CIVICA CARD READ

    /**
     * Generates binary commands sequence to read a civica card
     */
    generateCivicaCardReloadReadApduCommands$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.find$(args.conversationId)
            .pipe(
                map(conversation => (
                    {
                        conversation,
                        bytecode: CivicaCardReadWriteFlow.generateReadBytecode(conversation.cardType, args.dataType, conversation.currentCardAuth.cardRole !== undefined ? conversation.currentCardAuth.cardRole : 'DEBIT')
                    }
                )),
                mergeMap(({ conversation, bytecode }) => this.bytecodeCompiler.compile$(bytecode, conversation.cardType, conversation.readerType, { conversation, cardSecondStepAuthConfirmation: args.cardAuthConfirmationToken })),
                mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
                catchError(error => {
                    this.logError(error);
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
                    this.logError(error);
                    return GraphqlResponseTools.handleError$(error);
                })
            );
    }

    //#endregion

    //#region RELOAD PURCHASE

    /**
     * Tries to generate the purchase itself
     * @param {*} param0 
     * @param {*} authToken 
     */
    purchaseCivicaCardReload$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.find$(args.conversationId).pipe(
            mergeMap(conversation => this.verifyBusiness$(conversation.businessId, conversation)),
            mergeMap(conversation => CivicaCardReload.purchaseCivicaCardReload$(conversation, args.value)),
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(error => {
                this.logError(error);
                return GraphqlResponseTools.handleError$(error);
            })
        );
    }

    //#endregion

    //#region CIVICA WRITE AND READ

    /**
     * Generates the write card sequence to recharge the card after the reload purchase and adds the read card sequence to verify written data
     */
    generateCivicaCardReloadWriteAndReadApduCommands$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.find$(args.conversationId).pipe(
            map(conversation => (
                {
                    conversation,
                    bytecode: CivicaCardReadWriteFlow.generateWriteBytecode(conversation.cardType, args.dataType, conversation)
                }
            )),
            map(({ conversation, bytecode }) => (
                {
                    conversation,
                    bytecode: CivicaCardReadWriteFlow.generateReadBytecode(conversation.cardType, args.dataType, conversation.currentCardAuth.cardRole !== undefined ? conversation.currentCardAuth.cardRole : 'CREDIT', bytecode)
                }
            )),
            mergeMap(({ conversation, bytecode }) => this.bytecodeCompiler.compile$(bytecode, conversation.cardType, conversation.readerType, { conversation, cardSecondStepAuthConfirmation: args.cardAuthConfirmationToken })),
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(error => {
                this.logError(error);
                return GraphqlResponseTools.handleError$(error);
            })
        );
    }


    /**
     * process and translate binary commands respone sequence  to verify the card has valid data after being written and infers civica card data
     */
    processCivicaCardReloadWriteAndReadApduCommandResponses$({ root, args, jwt }, authToken) {
        return CivicaCardReloadConversationDA.find$(args.conversationId)
            .pipe(
                mergeMap(conversation =>
                    this.bytecodeCompiler.decompileResponses$(args.commands, conversation.cardType, conversation.readerType, { conversation }).pipe(map(bytecode => ({ bytecode, conversation })))
                ),
                mergeMap(({ bytecode, conversation }) => this.bytecodeMifareBindTools.applyBytecodeToMifareCard$(bytecode, conversation.finalCard.rawData).pipe(map(mifareCard => ({ conversation, mifareCard })))),
                mergeMap(({ conversation, mifareCard }) =>
                    CivicaCardReloadConversationDA.setFinalCardRawData$(conversation._id, mifareCard).pipe(
                        mergeMap(mifareCard => CivicaCardDataExtractor.extractCivicaData$(mifareCard)),
                        mergeMap(civicaData => CivicaCardReloadConversationDA.setFinalCardCivicaData$(conversation._id, civicaData)),
                    )),
                mergeMap((rawResponse) =>
                    CivicaCardReloadConversationDA.find$(args.conversationId)
                        .pipe(
                            mergeMap(conv => CivicaCardReload.sendCivicaCardReloadFinalCardUpdatedEvent$(conv)),
                            mapTo(rawResponse)
                        )
                ),
                mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse))
            ).pipe(
                catchError(error => {
                    this.logError(error);
                    return GraphqlResponseTools.handleError$(error);
                })
            );
    }
    //#endregion

    //#region TOOLS/OTHERS

    /**
     * Gets the reader master key
     */
    getCivicaCardReloadReaderKey$() {
        return Rx.of(
            { key: JSON.parse('[' + process.env.READER_MASTER_KEY + ']') }
        ).pipe(
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse))
        );
    }

    /**
     * Verifies the Business unit is allowed to spend wallet money
     * @param {*} conversation
     * @returns {Rx.Observable}
     */
    verifyBusiness$(businessId, returnObject) {
        return BusinessDA.find$(businessId).pipe(
            tap(business => { if (business === undefined || business === null) throw new CustomError('Unidad de negocio no encontrada', `verifique que el ID de su negocio sea el correcto`, BUSINESS_NOT_FOUND) }),
            tap(business => { if (!business.active) throw new CustomError('Unidad de negocio no activa', `comuniquese con el adminsitrador para activar su negocio `, BUSINESS_NOT_ACTIVE) }),
            tap(business => { if (business.wallet === undefined || business.wallet === null) throw new CustomError('Bolsas no encontradas', `comuniquese con el adminsitrador para activar su bolsas de saldo `, BUSINESS_WALLET_NOT_FOUND) }),
            tap(business => { if (!business.wallet.spendingAllowed) throw new CustomError('Venta no autorizada', `verifique su saldo`, BUSINESS_WALLET_SPENDING_FORBIDDEN) }),
            mapTo(returnObject)
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
            posLocation: conversation.pos.location.coordinates,
            readerType: conversation.readerType,
            cardType: conversation.cardType,
            cardUid: conversation.cardUid,
            uiState: conversation.uiState,
            uiStateHistory: conversation.uiStateHistory.map(h => h.uiState),
            purchase: conversation.purchase === undefined ? undefined : {
                granted: conversation.purchase.granted,
                errorMsg: conversation.purchase.errorMsg,
                receipt: conversation.purchase.receipt
            }
        };
    }

    /**
     * Logs an error at the console.error printing only the message and the stack related to the project source code
     * @param {Error} error 
     */
    logError(error) {
        if (!error.stack) {
            console.error(error);
            return;
        }
        const stackLines = error.stack.split('\n');
        console.error(
            stackLines[0] + '\n' + stackLines.filter(line => line.includes('civica-card/bin')).join('\n') + '\n'
        );
    }

    //#endregion

    //#region QUERIES

    /**  
     * Gets the civica card sales history according to the filter and pagination data
     *
     * @param {*} args args
     */
    getCivicaCardSalesHistory$({ args }, authToken) {
        return RoleValidator.checkPermissions$(
            authToken.realm_access.roles,
            "Civica-Card",
            "getCivicaCardSalesHistory",
            PERMISSION_DENIED,
            ["SYSADMIN", "platform-admin", "business-owner", "POS"]
        ).pipe(
            mergeMap(roles => {                
                const isAdmin = roles['SYSADMIN'] || roles['platform-admin'];
                //If an user does not have the role to get the civica card sales history from other business, we must return an error
                if (!isAdmin && authToken.businessId != args.civicaSaleFilterInput.businessId) {
                    throw new CustomError('Permiso denegado', `Solo puede consultar información de su propia unidad de negocio.`, PERMISSION_DENIED);
                }

                //Users with POS role can only search the sales that they have performed
                const isPOS = roles['POS'];
                if (!isAdmin && isPOS && authToken.preferred_username != args.civicaSaleFilterInput.user) {                    
                    throw new CustomError('Permiso denegado', `Solo puede consultar información de su usuario.`, PERMISSION_DENIED);
                }

                return of(roles);
            }),
            mergeMap(roles => CivicaCardReloadDA.getCivicaCardReloadsHistory$(args.civicaSaleFilterInput, args.civicaSalePaginationInput)),
            toArray(),
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(err => GraphqlResponseTools.handleError$(err))
        );
    }


    /**
    * Gets the amount of civica card reload of a business
    *
    * @param {*} args args
    */
    getCivicaCardSalesHistoryAmount$({ args }, authToken) {
        //console.log('getCivicaCardSalesHistoryAmount');
        return RoleValidator.checkPermissions$(
            authToken.realm_access.roles,
            "Civica-Card",
            "getCivicaCardSalesHistoryAmount",
            PERMISSION_DENIED,
            ["SYSADMIN", "platform-admin", "business-owner", "POS"]
        ).pipe(
            mergeMap(roles => {
                const isAdmin = roles['SYSADMIN'] || roles['platform-admin'];
                //If an user does not have the role to get the transaction history from other business, we must return an error
                if (!isAdmin && authToken.businessId != args.civicaSaleFilterInput.businessId) {
                    throw new CustomError('Permiso denegado', `Solo puede consultar información de su propia unidad de negocio.`, PERMISSION_DENIED);
                }

                //Users with POS role can only search the sales that they have performed
                const isPOS = roles['POS'];
                if (!isAdmin && isPOS && authToken.preferred_username != args.civicaSaleFilterInput.user) {
                    throw new CustomError('Permiso denegado', `Solo puede consultar información de su usuario.`, PERMISSION_DENIED);
                }

                return of(roles);
            }),
            mergeMap(val => CivicaCardReloadDA.getCivicaCardReloadAmount$(args.civicaSaleFilterInput)),
            toArray(),
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(err => GraphqlResponseTools.handleError$(err))
        );
    }

    /**
     * Gets the civica card reload history by ID
     *
     * @param {*} args args
     */
    getCivicaCardSaleHistoryById$({ args }, authToken) {
        // console.log('getCivicaCardSaleHistoryById');
        return RoleValidator.checkPermissions$(
            authToken.realm_access.roles,
            "Civica-Card",
            "getCivicaCardSaleHistoryById",
            PERMISSION_DENIED,
            ["SYSADMIN", "platform-admin", "business-owner", "POS"]
        ).pipe(
            mergeMap(roles => {
                const isAdmin = roles['SYSADMIN'] || roles['platform-admin'];
                //If an user does not have the role to get the transaction history from other business, the query must be filtered with the businessId of the user
                const businessId = !isAdmin ? (authToken.businessId || '') : null;

                let user = null;
                const isPOS = roles['POS'];
                if (!isAdmin && isPOS) {
                    user = authToken.preferred_username;
                }

                return CivicaCardReloadDA.getCivicaCardReloadHistoryById$(businessId, args.id, user);
            }),
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(err => GraphqlResponseTools.handleError$(err))
        );
    }

    /**
   * Finds a CivicaCardReloadConversation by its ID, format it to the graphql schema and returns it
   */
    getCivicaCardReloadConversationDetailed$({ root, args, jwt }, authToken) {
        return RoleValidator.checkPermissions$(
            authToken.realm_access.roles,
            "Civica-Card",
            "getCivicaCardReloadConversationDetailed",
            PERMISSION_DENIED,
            ["SYSADMIN"]
        ).pipe(
            mergeMap(roles => CivicaCardReloadConversationDA.find$(args.id)),
            map(conversation => JSON.stringify(conversation)),
            mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
            catchError(error => {
                this.logError(error);
                return GraphqlResponseTools.handleError$(error);
            })
        );
    }

    //#endregion

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