import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject } from "rxjs";
import {
  startWith
} from "rxjs/operators";
import { GatewayService } from "../../../../api/gateway.service";
import * as moment from "moment";
import {
  civicaCardSalesHistory,
  civicaCardSalesHistoryAmount,
} from "../gql/civicaCardSales";

@Injectable()
export class SaleHistoryService {

  private selectedBusinessSubject$ = new BehaviorSubject<any>(null);
  private _filterAndPaginator$ = new BehaviorSubject({
    filter: {
      initDate: moment().startOf('month'),
      endDate: moment().endOf('day'),
      terminal: {}
    },
    pagination: {
      page: 0, count: 10, sort: -1
    },
  });

  constructor(private gateway: GatewayService) {}

  addFilterAndPaginatorData(filterAndPaginator) {
    this._filterAndPaginator$.next(filterAndPaginator);
  }

  /**
   * @returns {Observable<any>}
   */
  get filterAndPaginator$(): Observable<any> {
    return this._filterAndPaginator$.asObservable()
  }

  /**
   * Returns an observable
   */
  get selectedBusinessEvent$() {
    return this.selectedBusinessSubject$.asObservable();
  }

  /**
   * Set the selected business
   */
  selectBusiness(business) {
    this.selectedBusinessSubject$.next(business);
  }

  /**
   * Gets the sales history according to the filter data and pagination.
   *
   * @param filterInput
   * @param paginationInput
   * @returns {Observable}
   */
  getSalesHistory$(civicaSaleFilterInput, civicaSalePaginationInput) {
    return this.gateway.apollo.query<any>({
      query: civicaCardSalesHistory,
      variables: {
        civicaSaleFilterInput: civicaSaleFilterInput,
        civicaSalePaginationInput: civicaSalePaginationInput
      },
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

  /**
   * Gets the sales history amount according to the filter data.
   *
   * @param filterInput
   * @returns {Observable}
   */
  getSalesHistoryAmount$(civicaSaleFilterInput) {
    return this.gateway.apollo.query<any>({
      query: civicaCardSalesHistoryAmount,
      variables: {
        civicaSaleFilterInput: civicaSaleFilterInput
      },
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

}
