"use strict";
const Rx = require("rxjs");
const eventSourcing = require("../../tools/EventSourcing")();
const { map, switchMap, filter, mergeMap, concatMap } = require('rxjs/operators');
const { businessES } = require('../../domain/business');
/**
 * Singleton instance
 */
let instance;
/**
 * Micro-BackEnd key
 */
const mbeKey = "ms-civica-card_mbe_civica-card";

class EventStoreService {
  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
    this.aggregateEventsArray = this.generateAggregateEventsArray();
  }

  /**
   * Starts listening to the EventStore
   * Returns observable that resolves to each subscribe agregate/event
   *    emit value: { aggregateType, eventType, handlerName}
   */
  start$() {
    //default error handler
    const onErrorHandler = error => {
      console.error("Error handling  EventStore incoming event", error);
      process.exit(1);
    };
    //default onComplete handler
    const onCompleteHandler = () => {
      () => console.log("EventStore incoming event subscription completed");
    };
    console.log("EventStoreService starting ...");

    return Rx.from(this.aggregateEventsArray).pipe(
      map(aggregateEvent => ({ ...aggregateEvent, onErrorHandler, onCompleteHandler }))
      ,map(params => this.subscribeEventHandler(params))
    );      
  }

  /**
   * Stops listening to the Event store
   * Returns observable that resolves to each unsubscribed subscription as string
   */
  stop$() {
    return Rx.from(this.subscriptions).pipe(
      map(subscription => {
        subscription.subscription.unsubscribe();
        return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
      })
    );
  }

  /**
     * Create a subscrition to the event store and returns the subscription info     
     * @param {{aggregateType, eventType, onErrorHandler, onCompleteHandler}} params
     * @return { aggregateType, eventType, handlerName  }
     */
  subscribeEventHandler({ aggregateType, eventType, onErrorHandler, onCompleteHandler }) {
    const handler = this.functionMap[eventType];
    const subscription =
      //MANDATORY:  AVOIDS ACK REGISTRY DUPLICATIONS
      eventSourcing.eventStore.ensureAcknowledgeRegistry$(aggregateType).pipe(
        mergeMap(() => eventSourcing.eventStore.getEventListener$(aggregateType, mbeKey))
        ,filter(evt => evt.et === eventType)
        ,mergeMap(evt => Rx.concat(
          handler.fn.call(handler.obj, evt),
          //MANDATORY:  ACKWOWLEDGE THIS EVENT WAS PROCESSED
          eventSourcing.eventStore.acknowledgeEvent$(evt, mbeKey),
        ))
      )
        .subscribe(
          (evt) => {
            // console.log(`EventStoreService: ${eventType} process: ${evt}`);
          },
          onErrorHandler,
          onCompleteHandler
        );
    this.subscriptions.push({ aggregateType, eventType, handlerName: handler.fn.name, subscription });
    return { aggregateType, eventType, handlerName: `${handler.obj.name}.${handler.fn.name}` };
  }

  /**
  * Starts listening to the EventStore
  * Returns observable that resolves to each subscribe agregate/event
  *    emit value: { aggregateType, eventType, handlerName}
  */
  syncState$() {
    return Rx.from(this.aggregateEventsArray).pipe(
      concatMap(params => this.subscribeEventRetrieval$(params))
    )
  }


  /**
   * Create a subscrition to the event store and returns the subscription info     
   * @param {{aggregateType, eventType, onErrorHandler, onCompleteHandler}} params
   * @return { aggregateType, eventType, handlerName  }
   */
  subscribeEventRetrieval$({ aggregateType, eventType }) {
    const handler = this.functionMap[eventType];
    //MANDATORY:  AVOIDS ACK REGISTRY DUPLICATIONS
    return eventSourcing.eventStore.ensureAcknowledgeRegistry$(aggregateType).pipe(
      switchMap(() => eventSourcing.eventStore.retrieveUnacknowledgedEvents$(aggregateType, mbeKey))
      ,filter(evt => evt.et === eventType)
      ,concatMap(evt => Rx.concat(
        handler.fn.call(handler.obj, evt),
        //MANDATORY:  ACKWOWLEDGE THIS EVENT WAS PROCESSED
        eventSourcing.eventStore.acknowledgeEvent$(evt, mbeKey)
      ))
    );
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW     //////////////
  ////////////////////////////////////////////////////////////////////////////////////////

  generateFunctionMap() {
    return {      
      BusinessActivated: {
        fn: businessES.handleBusinessActivatedEvent$,
        obj: businessES
      },
      BusinessDeactivated: {
        fn: businessES.handleBusinessDeactivatedEvent$,
        obj: businessES
      },
      WalletSpendingForbidden: {
        fn: businessES.handleWalletSpendingForbiddenEvent$,
        obj: businessES
      },
      WalletSpendingAllowed: {
        fn: businessES.handleWalletSpendingAllowedEvent$,
        obj: businessES
      },
    };
  }

  /**
  * Generates a map that assocs each AggretateType withs its events
  */
  generateAggregateEventsArray() {
    return [
    
      {
        aggregateType: "Business",
        eventType: "BusinessActivated"
      },
      {
        aggregateType: "Business",
        eventType: "BusinessDeactivated"
      },
      {
        aggregateType: "Wallet",
        eventType: "WalletSpendingForbidden"
      },
      {
        aggregateType: "Wallet",
        eventType: "WalletSpendingAllowed"
      },

    ]
  }
}



/**
 * @returns {EventStoreService}
 */
module.exports = () => {
  if (!instance) {
    instance = new EventStoreService();
    console.log("NEW  EventStore instance  !!");
  }
  return instance;
};

