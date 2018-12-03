import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';
import {
  getWallet,
  walletUpdated
} from './gql/wallet.js';

@Injectable()
export class CivicaCardReloadPosService {


  constructor(private gateway: GatewayService) {

  }

   /**
   * get wallet info of a business
   *
   * @param businessId ID of business to filter
   * @returns {Observable}
   */
  getWallet$(businessId) {
    return this.gateway.apollo.query<any>({
      query: getWallet,
      variables: {
        businessId: businessId
      },
      errorPolicy: 'all'
    });
  }

   /**
   * Receives an event with the last wallet state when a wallet has been updated.
   * @param businessId
   */
  getWalletUpdatedSubscription$(businessId): Observable<any> {
    return this.gateway.apollo
      .subscribe({
        query: walletUpdated,
        variables: {
          businessId: businessId
        },
      })
      .map(resp => {
        console.log('resp.data.walletUpdated => ', resp);
        return resp.data.walletUpdated;
      });
  }



}
