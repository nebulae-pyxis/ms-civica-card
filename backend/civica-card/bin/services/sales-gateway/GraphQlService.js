"use strict";

const {civicaCardCQRS} = require("../../domain/civica-card/");
const broker = require("../../tools/broker/BrokerFactory")();
const Rx = require("rxjs");
const jsonwebtoken = require("jsonwebtoken");
const { map, mergeMap, catchError, tap } = require('rxjs/operators');
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");
const {handleError$} = require('../../tools/GraphqlResponseTools');


let instance;

class GraphQlService {


  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
  }

  /**
   * Starts GraphQL actions listener
   */
  start$() {
    //default on error handler
    const onErrorHandler = (error) => {
      console.error("Error handling  GraphQl incoming event", error);
      process.exit(1);
    };

    //default onComplete handler
    const onCompleteHandler = () => {
      () => console.log("GraphQlService incoming event subscription completed");
    };
    return Rx.from(this.getSubscriptionDescriptors()).pipe(
      map(aggregateEvent => ({ ...aggregateEvent, onErrorHandler, onCompleteHandler }))
      , map(params => this.subscribeEventHandler(params))
    )
  }

  /**
   * build a Broker listener to handle GraphQL requests procesor
   * @param {*} descriptor 
   */
  subscribeEventHandler({
    aggregateType,
    messageType,
    onErrorHandler,
    onCompleteHandler
  }) {
    const handler = this.functionMap[messageType];
    const subscription = broker
      .getMessageListener$([aggregateType], [messageType]).pipe(
        mergeMap(message => this.verifyRequest$(message))
        , mergeMap(request => (request.failedValidations.length > 0)
          ? Rx.of(request.errorResponse)
          : Rx.of(request).pipe(
            //tap(  ({ authToken, message }) => console.log(`############ ${JSON.stringify({ authToken, message })}`) ),
            //ROUTE MESSAGE TO RESOLVER
            mergeMap(({ authToken, message }) =>
              handler.fn
                .call(handler.obj, message.data, authToken).pipe(
                  map(response => ({ response, correlationId: message.id, replyTo: message.attributes.replyTo }))
                )
            )
          )
        )
        , mergeMap(msg => this.sendResponseBack$(msg))
      )
      .subscribe(
        msg => { /* console.log(`GraphQlService: ${messageType} process: ${msg}`); */ },
        onErrorHandler,
        onCompleteHandler
      );
    this.subscriptions.push({
      aggregateType,
      messageType,
      handlerName: handler.fn.name,
      subscription
    });
    return {
      aggregateType,
      messageType,
      handlerName: `${handler.obj.name}.${handler.fn.name}`
    };
  }

  /**
 * Verify the message if the request is valid.
 * @param {any} request request message
 * @returns { Rx.Observable< []{request: any, failedValidations: [] }>}  Observable object that containg the original request and the failed validations
 */
  verifyRequest$(request) {
    return Rx.of(request).pipe(
      //decode and verify the jwt token
      mergeMap(message =>
        Rx.of(message).pipe(
          map(message => ({ authToken: jsonwebtoken.verify(message.data.jwt, jwtPublicKey), message, failedValidations: [] }))
          , catchError(err =>
            handleError$(err).pipe(
              map(response => ({
                errorResponse: { response, correlationId: message.id, replyTo: message.attributes.replyTo },
                failedValidations: ['JWT']
              }
              ))
            )
          )
        )
      )
    )
  }

  /**
   * 
   * @param {any} msg Object with data necessary  to send response
   */
  sendResponseBack$(msg) {
    return Rx.of(msg).pipe(mergeMap(
      ({ response, correlationId, replyTo }) =>
        replyTo
          ? broker.send$(replyTo, "salesgateway.graphql.Query.response", response, {
            correlationId
          })
          : Rx.of(undefined)
    ));
  }

  stop$() {
    Rx.from(this.subscriptions).pipe(
      map(subscription => {
        subscription.subscription.unsubscribe();
        return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
      })
    );
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW  /////////////////
  ////////////////////////////////////////////////////////////////////////////////////////


  /**
   * returns an array of broker subscriptions for listening to GraphQL requests
   */
  getSubscriptionDescriptors() {
    console.log("GraphQl Service starting ...");
    return [

      {
        aggregateType: "CivicaCard",
        messageType: "salesgateway.graphql.query.CivicaCardReloadConversation"
      },
      {
        aggregateType: "CivicaCard",
        messageType: "salesgateway.graphql.query.getMasterKeyReloader"
      },
      {
        aggregateType: "CivicaCard",
        messageType: "salesgateway.graphql.mutation.startCivicaCardReloadConversation"
      },
      {
        aggregateType: "CivicaCard",
        messageType: "salesgateway.graphql.mutation.generateCivicaCardReloadSecondAuthToken"
      },
      {
        aggregateType: "CivicaCard",
        messageType: "salesgateway.graphql.mutation.generateCivicaCardReloadReadApduCommands"
      },
      {
        aggregateType: "CivicaCard",
        messageType: "salesgateway.graphql.mutation.processCivicaCardReloadReadApduCommandRespones"
      },

      {
        aggregateType: "CivicaCard",
        messageType: "salesgateway.graphql.mutation.purchaseCivicaCardReload"
      },
      {
        aggregateType: "CivicaCard",
        messageType: "salesgateway.graphql.mutation.generateCivicaCardReloadWriteAndReadApduCommands"
      },
      {
        aggregateType: "CivicaCard",
        messageType: "salesgateway.graphql.mutation.processCivicaCardReloadWriteAndReadApduCommandResponses"
      },
      {
        aggregateType: "CivicaCard",
        messageType: "salesgateway.graphql.mutation.setCivicaCardReloadConversationUiState"
      },

    ];
  }


  /**
   * returns a map that assocs GraphQL request with its processor
   */
  generateFunctionMap() {
    return {

      "salesgateway.graphql.query.CivicaCardReloadConversation": {
        fn: civicaCardCQRS.getCivicaCardReloadConversation$,
        obj: civicaCardCQRS
      },
      "salesgateway.graphql.query.getMasterKeyReloader": {
        fn: civicaCardCQRS.getCivicaCardReloadReaderKey$,
        obj: civicaCardCQRS
      },
      "salesgateway.graphql.mutation.startCivicaCardReloadConversation": {
        fn: civicaCardCQRS.startCivicaCardReloadConversation$,
        obj: civicaCardCQRS
      },
      "salesgateway.graphql.mutation.generateCivicaCardReloadSecondAuthToken": {
        fn: civicaCardCQRS.generateCivicaCardReloadSecondAuthToken$,
        obj: civicaCardCQRS
      },
      "salesgateway.graphql.mutation.generateCivicaCardReloadReadApduCommands": {
        fn: civicaCardCQRS.generateCivicaCardReloadReadApduCommands$,
        obj: civicaCardCQRS
      },
      "salesgateway.graphql.mutation.processCivicaCardReloadReadApduCommandRespones": {
        fn: civicaCardCQRS.processCivicaCardReloadReadApduCommandRespones$,
        obj: civicaCardCQRS
      },

      "salesgateway.graphql.mutation.purchaseCivicaCardReload": {
        fn: civicaCardCQRS.purchaseCivicaCardReload$,
        obj: civicaCardCQRS
      },
      "salesgateway.graphql.mutation.generateCivicaCardReloadWriteAndReadApduCommands": {
        fn: civicaCardCQRS.generateCivicaCardReloadWriteAndReadApduCommands$,
        obj: civicaCardCQRS
      },
      "salesgateway.graphql.mutation.processCivicaCardReloadWriteAndReadApduCommandResponses": {
        fn: civicaCardCQRS.processCivicaCardReloadWriteAndReadApduCommandResponses$,
        obj: civicaCardCQRS
      },
      "salesgateway.graphql.mutation.setCivicaCardReloadConversationUiState": {
        fn: civicaCardCQRS.setCivicaCardReloadConversationUiState$,
        obj: civicaCardCQRS
      },
    };
  }
}

/**
 * @returns {GraphQlService}
 */
module.exports = () => {
  if (!instance) {
    instance = new GraphQlService();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
