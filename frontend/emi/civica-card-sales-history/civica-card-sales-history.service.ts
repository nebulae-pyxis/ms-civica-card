import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';

import {
  getWalletBusiness,
  getWalletBusinesses,
  getWallet,
  getWalletBusinessById,
  getBusinessByFilter,
  walletUpdated
} from "./gql/civicaCardSales";

@Injectable()
export class CivicaCardSalesHistoryService {


  constructor(private gateway: GatewayService) {

  }


  getBusinessByFilter(filterText: String, limit: number): Observable<any> {
    return this.gateway.apollo
      .query<any>({
        query: getBusinessByFilter,
        variables: {
          filterText: filterText,
          limit: limit
        },
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      });
  }

/**
 * get the business by id
 *
 * @returns {Observable}
 */
getBusinessById$(id) {
  return this.gateway.apollo
    .query<any>({
      query: getWalletBusinessById,
      variables: {
        id: id
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
}

/**
 * get the business which the user belongs
 *
 * @returns {Observable}
 */
getBusiness$() {
  return this.gateway.apollo.query<any>({
    query: getWalletBusiness,
    fetchPolicy: "network-only",
    errorPolicy: "all"
  });
}

/**
 * get all of the businesses
 *
 * @returns {Observable}
 */
getBusinesses$() {
  return this.gateway.apollo.query<any>({
    query: getWalletBusinesses,
    fetchPolicy: "network-only",
    errorPolicy: "all"
  });
}

}
