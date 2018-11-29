const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const Rx = require("rxjs");
const broker = require("../../broker/BrokerFactory")();
const RoleValidator = require("../../tools/RoleValidator");
const INTERNAL_SERVER_ERROR_CODE = 1;
const PERMISSION_DENIED_ERROR_CODE = 2;

function getResponseFromBackEnd$(response) {
  return Rx.Observable.of(response).map(resp => {
    if (resp.result.code != 200) {
      const err = new Error();
      err.name = "Error";
      err.message = resp.result.error;
      // this[Symbol()] = resp.result.error;
      Error.captureStackTrace(err, "Error");
      throw err;
    }
    return resp.data;
  });
}

module.exports = {
  //// QUERY ///////
  Query: {
    civicaCardSalesHistory(root, args, context) {
        return RoleValidator.checkPermissions$(
          context.authToken.realm_access.roles,
          'ms-civica-card',
          "civicaCardSalesHistory",
          PERMISSION_DENIED_ERROR_CODE,
          "Permission denied",
          ["SYSADMIN", "platform-admin", "business-owner", "POS"]
        )
          .mergeMap(response => {
            console.log('civicaCardSalesHistory => ',args);
            return broker.forwardAndGetReply$(
              "CivicaCard",
              "emigateway.graphql.query.civicaCardSalesHistory",
              { root, args, jwt: context.encodedToken },
              2000
            );
          })
          //.catch(err => handleError$(err, "civicaCardSalesHistory"))
          .mergeMap(response => getResponseFromBackEnd$(response))
          .toPromise();
      },
      civicaCardSalesHistoryAmount(root, args, context) {
        return RoleValidator.checkPermissions$(
          context.authToken.realm_access.roles,
          'ms-civica-card',
          "civicaCardSalesHistoryAmount",
          PERMISSION_DENIED_ERROR_CODE,
          "Permission denied",
          ["SYSADMIN", "platform-admin", "business-owner", "POS"]
        )
          .mergeMap(response => {
            return broker.forwardAndGetReply$(
              "CivicaCard",
              "emigateway.graphql.query.civicaCardSalesHistoryAmount",
              { root, args, jwt: context.encodedToken },
              2000
            );
          })
          //.catch(err => handleError$(err, "civicaCardSalesHistoryAmount"))
          .mergeMap(response => getResponseFromBackEnd$(response))
          .toPromise();
      },
      civicaCardSaleHistory(root, args, context) {
        console.log('civicaCardSaleHistory *** ', args);
        return RoleValidator.checkPermissions$(
          context.authToken.realm_access.roles,
          'ms-civica-card',
          "civicaCardSaleHistory",
          PERMISSION_DENIED_ERROR_CODE,
          "Permission denied",
          ["SYSADMIN", "platform-admin", "business-owner", "POS"]
        )
          .mergeMap(response => {
            return broker.forwardAndGetReply$(
              "CivicaCard",
              "emigateway.graphql.query.civicaCardSaleHistory",
              { root, args, jwt: context.encodedToken },
              2000
            );
          })
          //.catch(err => handleError$(err, "civicaCardSaleHistory"))
          .mergeMap(response => getResponseFromBackEnd$(response))
          .toPromise();
      },
      civicaCardReloadConversation(root, args, context) {
        console.log('civicaCardReloadConversation *** ', args);
        return RoleValidator.checkPermissions$(
          context.authToken.realm_access.roles,
          'ms-civica-card',
          "civicaCardReloadConversation",
          PERMISSION_DENIED_ERROR_CODE,
          "Permission denied",
          ["SYSADMIN"]
        )
          .mergeMap(response => {
            return broker.forwardAndGetReply$(
              "CivicaCard",
              "emigateway.graphql.query.civicaCardReloadConversation",
              { root, args, jwt: context.encodedToken },
              2000
            );
          })
          //.catch(err => handleError$(err, "civicaCardSaleHistory"))
          .mergeMap(response => getResponseFromBackEnd$(response))
          .toPromise();
      },
  },

  //// MUTATIONS ///////
  Mutation: {},
  //// SUBSCRIPTIONS ///////
  Subscription: {}
};

//// SUBSCRIPTIONS SOURCES ////

const eventDescriptors = [
  {
    backendEventName: "walletUpdated",
    gqlSubscriptionName: "walletUpdated",
    dataExtractor: evt => evt.data, // OPTIONAL, only use if needed
    onError: (error, descriptor) =>
      console.log(`Error processing ${descriptor.backendEventName}`), // OPTIONAL, only use if needed
    onEvent: (evt, descriptor) => {} // console.log(`Event of type  ${descriptor.backendEventName} arraived`),// OPTIONAL, only use if needed
  }
];

/**
 * Connects every backend event to the right GQL subscription
 */
eventDescriptors.forEach(descriptor => {
  broker.getMaterializedViewsUpdates$([descriptor.backendEventName]).subscribe(
    evt => {
      if (descriptor.onEvent) {
        descriptor.onEvent(evt, descriptor);
      }
      const payload = {};
      payload[descriptor.gqlSubscriptionName] = descriptor.dataExtractor
        ? descriptor.dataExtractor(evt)
        : evt.data;
      pubsub.publish(descriptor.gqlSubscriptionName, payload);
    },

    error => {
      if (descriptor.onError) {
        descriptor.onError(error, descriptor);
      }
      console.error(`Error listening ${descriptor.gqlSubscriptionName}`, error);
    },

    () => console.log(`${descriptor.gqlSubscriptionName} listener STOPED`)
  );
});
