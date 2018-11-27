import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../../../environments/environment';
import { Apollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular-link-http';
import { setContext } from 'apollo-link-context';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { WebSocketLink } from 'apollo-link-ws';
import { split } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { ApolloClient } from 'apollo-client';
import { getMainDefinition } from 'apollo-utilities';

@Injectable({
  providedIn: 'root'
})
export class GatewayService {
  token;
  constructor(public apollo: Apollo, private httpLink: HttpLink) {}

  initService() {
    // HTTP end-point
    // const http = createHttpLink({
    //   uri: environment.api.gateway.graphql.httpEndPoint
    // });
    const http = this.httpLink.create({
      uri: environment.salesHttpEndPoint
    });
    //#region keycloakEvents$ subscription
    //#endregion
    // Add the JWT token in every request
    const auth = setContext((_, { headers }) => {
      return {
        headers: {
          ...headers,
          authorization: this.token ? `Bearer ${this.token}` : ''
        }
      };
    });
    // const auth = setContext((request, previousContext) => ({
    //   authorization: this.token
    // }));

    // Create a WebSocket link:
    const ws = new WebSocketLink({
      uri: environment.salesWsEndPoint,
      options: {
        reconnect: true,
        connectionParams: {
          authToken: this.token
        }
      }
    });

    // using the ability to split links, you can send data to each link
    // depending on what kind of operation is being sent
    const link = split(
      // split based on operation type
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      ws,
      auth.concat(http)
    );

    // Create Apollo client
    // const link = auth.concat(http);
    this.apollo.create({
      link,
      cache: new InMemoryCache()
    }, 'sales-gateway');
  }
}
