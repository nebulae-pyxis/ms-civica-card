import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';
import {
  getWallet,
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
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
  }



}
