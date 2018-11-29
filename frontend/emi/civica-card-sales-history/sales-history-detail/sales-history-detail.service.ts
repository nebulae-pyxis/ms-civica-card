import { Injectable } from '@angular/core';
import { GatewayService } from '../../../../api/gateway.service';
import {
  civicaCardSalesHistoryById,
  civicaCardReloadConversation
} from '../gql/civicaCardSales';

@Injectable()
export class SalesHistoryDetailService {

  constructor(private gateway: GatewayService) { }

  /**
   * Gets the civica card reload sale history by id
   * @param saleHistoryId sale history id filter
   */
  getSaleHistoryById$(saleHistoryId) {
    return this.gateway.apollo
      .query<any>({
        query: civicaCardSalesHistoryById,
        variables: {
          id: saleHistoryId
        },
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      });
  }

  getCivicaCardReloadConversation$(conversationId) {
    return this.gateway.apollo
      .query<any>({
        query: civicaCardReloadConversation,
        variables: {
          id: conversationId
        },
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      });
  }

}
