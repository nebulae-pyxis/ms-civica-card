import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';

import {
  getBusinessByFilterText,
  getMyBusiness,
  getBusinessById
} from "./gql/civicaCardSales";

@Injectable()
export class CivicaCardSalesHistoryService {


  constructor(private gateway: GatewayService) {

  }

  getBusinessByFilter(filterText: String, limit: number): Observable<any> {
    return this.gateway.apollo
      .query<any>({
        query: getBusinessByFilterText,
        variables: {
          filterText: filterText,
          limit: limit
        },
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      });
  }

  /**
   * Get the business to which the user belongs
   * @returns {Observable}
   */
  getMyBusiness$(){
    return this.gateway.apollo
      .query<any>({
        query: getMyBusiness,
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
        query: getBusinessById,
        variables: {
          id: id
        },
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      });
  }

}
