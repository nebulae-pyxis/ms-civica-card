const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const Rx = require("rxjs");
const broker = require("../../broker/BrokerFactory")();
const RoleValidator = require('../../tools/RoleValidator');
const INTERNAL_SERVER_ERROR_CODE = 18001;
const USERS_PERMISSION_DENIED_ERROR_CODE = 18002;

function getResponseFromBackEnd$(response) {
    return Rx.Observable.of(response)
        .map(resp => {
            if (resp.result.code != 200) {
                const err = new Error();
                err.name = 'Error';
                err.message = resp.result.error;
                // this[Symbol()] = resp.result.error;
                Error.captureStackTrace(err, 'Error');
                throw err;
            }
            return resp.data;
        });
}

module.exports = {

    //// QUERY ///////
    Query: {
        CivicaCardReloadConversation(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-civca-card', 'CivicaCardReloadConversation', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['POS'])                
                .switchMapTo(
                    broker.forwardAndGetReply$("CivicaCard", "salesgateway.graphql.query.CivicaCardReloadConversation", { root, args, jwt: context.encodedToken }, 500)
                        .mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },

    },

    //// MUTATIONS ///////
    Mutation: {
        startCivicaCardReloadConversation(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-civca-card', 'startCivicaCardReloadConversation', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['POS'])
                .mergeMap(() =>
                    broker.forwardAndGetReply$("CivicaCard", "salesgateway.graphql.mutation.startCivicaCardReloadConversation", { root, args, jwt: context.encodedToken }, 500)
                        .mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },

        setCivicaCardReloadConversationUiState(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-civca-card', 'setCivicaCardReloadConversationUiState', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['POS'])
                .mergeMap(() =>
                    broker.forwardAndGetReply$("CivicaCard", "salesgateway.graphql.mutation.setCivicaCardReloadConversationUiState", { root, args, jwt: context.encodedToken }, 500)
                        .mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },

        generateCivicaCardReloadSecondAuthToken(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-civca-card', 'generateCivicaCardReloadSecondAuthToken', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['POS'])
                .mergeMap(() =>
                    broker.forwardAndGetReply$("CivicaCard", "salesgateway.graphql.mutation.generateCivicaCardReloadSecondAuthToken", { root, args, jwt: context.encodedToken }, 1000)
                        .mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },

        generateCivicaCardReloadReadApduCommands(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-civca-card', 'generateCivicaCardReloadReadApduCommands', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['POS'])
                .mergeMap(() =>
                    broker.forwardAndGetReply$("CivicaCard", "salesgateway.graphql.mutation.generateCivicaCardReloadReadApduCommands", { root, args, jwt: context.encodedToken }, 1000)
                        .mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },

        processCivicaCardReloadReadApduCommandRespones(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-civca-card', 'processCivicaCardReloadReadApduCommandRespones', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['POS'])
                .mergeMap(() =>
                    broker.forwardAndGetReply$("CivicaCard", "salesgateway.graphql.mutation.processCivicaCardReloadReadApduCommandRespones", { root, args, jwt: context.encodedToken }, 1000)
                        .mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },

        purchaseCivicaCardReload(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-civca-card', 'purchaseCivicaCardReload', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['POS'])
                .mergeMap(() =>
                    broker.forwardAndGetReply$("CivicaCard", "salesgateway.graphql.mutation.purchaseCivicaCardReload", { root, args, jwt: context.encodedToken }, 1000)
                        .mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },

        generateCivicaCardReloadWriteAndReadApduCommands(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-civca-card', 'generateCivicaCardReloadWriteAndReadApduCommands', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['POS'])
                .mergeMap(() =>
                    broker.forwardAndGetReply$("CivicaCard", "salesgateway.graphql.mutation.generateCivicaCardReloadWriteAndReadApduCommands", { root, args, jwt: context.encodedToken }, 4000)
                        .mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },

        processCivicaCardReloadWriteAndReadApduCommandResponses(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-civca-card', 'processCivicaCardReloadWriteAndReadApduCommandResponses', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['POS'])
                .mergeMap(() =>
                    broker.forwardAndGetReply$("CivicaCard", "salesgateway.graphql.mutation.processCivicaCardReloadWriteAndReadApduCommandResponses", { root, args, jwt: context.encodedToken }, 4000)
                        .mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },

    },
};



//// SUBSCRIPTIONS SOURCES ////

const eventDescriptors = [
    {
        backendEventName: 'civicaCardHelloWorldEvent',
        gqlSubscriptionName: 'civicaCardHelloWorldSubscription',
        dataExtractor: (evt) => evt.data,// OPTIONAL, only use if needed
        onError: (error, descriptor) => console.log(`Error processing ${descriptor.backendEventName}`),// OPTIONAL, only use if needed
        onEvent: (evt, descriptor) => console.log(`Event of type  ${descriptor.backendEventName} arraived`),// OPTIONAL, only use if needed
    },
];


/**
 * Connects every backend event to the right GQL subscription
 */
eventDescriptors.forEach(descriptor => {
    broker
        .getMaterializedViewsUpdates$([descriptor.backendEventName])
        .subscribe(
            evt => {
                if (descriptor.onEvent) {
                    descriptor.onEvent(evt, descriptor);
                }
                const payload = {};
                payload[descriptor.gqlSubscriptionName] = descriptor.dataExtractor ? descriptor.dataExtractor(evt) : evt.data
                pubsub.publish(descriptor.gqlSubscriptionName, payload);
            },

            error => {
                if (descriptor.onError) {
                    descriptor.onError(error, descriptor);
                }
                console.error(
                    `Error listening ${descriptor.gqlSubscriptionName}`,
                    error
                );
            },

            () =>
                console.log(
                    `${descriptor.gqlSubscriptionName} listener STOPED`
                )
        );
});






// Query: {
//     getReadCardSeconduthToken(root, args, context) {
//         return broker
//             .forwardAndGetReply$(
//                 "CivicaCard",
//                 "sales-gateway.graphql.query.getReadCardSeconduthToken",
//                 { root, args, jwt: context.encodedToken },
//                 2000
//             )
//             .mergeMap(response => getResponseFromBackEnd$(response))
//             .toPromise();
//     },
//     getReaderKey(root, args, context) {
//         return broker
//             .forwardAndGetReply$(
//                 "CivicaCard",
//                 "sales-gateway.graphql.query.getReaderKey",
//                 { root, args, jwt: context.encodedToken },
//                 2000
//             )
//             .mergeMap(response => getResponseFromBackEnd$(response))
//             .toPromise();
//     },
//     getReadCardApduCommands(root, args, context) {
//         return broker
//             .forwardAndGetReply$(
//                 "CivicaCard",
//                 "sales-gateway.graphql.query.getReadCardApduCommands",
//                 { root, args, jwt: context.encodedToken },
//                 2000
//             )
//             .mergeMap(response => getResponseFromBackEnd$(response))
//             .toPromise();
//     },
//     extractReadCardData(root, args, context) {
//         return broker
//             .forwardAndGetReply$(
//                 "CivicaCard",
//                 "sales-gateway.graphql.query.extractReadCardData",
//                 { root, args, jwt: context.encodedToken },
//                 2000
//             )
//             .mergeMap(response => getResponseFromBackEnd$(response))
//             .toPromise();
//     },
//     getCardReloadInfo(root, args, context) {
//         return broker
//             .forwardAndGetReply$(
//                 "CivicaCard",
//                 "sales-gateway.graphql.query.getCardReloadInfo",
//                 { root, args, jwt: context.encodedToken },
//                 2000
//             )
//             .mergeMap(response => getResponseFromBackEnd$(response))
//             .toPromise();
//     },
//     extractReadWriteCardData(root, args, context) {
//         return broker
//             .forwardAndGetReply$(
//                 "CivicaCard",
//                 "sales-gateway.graphql.query.extractReadWriteCardData",
//                 { root, args, jwt: context.encodedToken },
//                 2000
//             )
//             .mergeMap(response => getResponseFromBackEnd$(response))
//             .toPromise();
//     },
//     getConversation(root, args, context) {
//         return broker
//             .forwardAndGetReply$(
//                 "CivicaCard",
//                 "sales-gateway.graphql.query.getConversation",
//                 { root, args, jwt: context.encodedToken },
//                 2000
//             )
//             .mergeMap(response => getResponseFromBackEnd$(response))
//             .toPromise();
//     },

// },

