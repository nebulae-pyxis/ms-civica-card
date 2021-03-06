////////// ANGULAR //////////
import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

////////// RXJS ///////////
import {
  map,
  mergeMap,
  toArray,
  filter,
  tap,
  takeUntil,
  startWith,
  debounceTime,
  distinctUntilChanged
} from "rxjs/operators";
import { Subject, fromEvent, of, Observable } from "rxjs";

//////////// Services ////////////
import { KeycloakService } from "keycloak-angular";
import { CivicaCardSalesHistoryService } from "./../civica-card-sales-history.service";
import { SalesHistoryDetailService } from "./sales-history-detail.service";
import { PrintDialogComponent } from "../print-dialog/print-dialog.component";

//////////// i18n ////////////
import { FuseTranslationLoaderService } from "../../../../core/services/translation-loader.service";
import { TranslateService } from "@ngx-translate/core";
import { locale as english } from "../i18n/en";
import { locale as spanish } from "../i18n/es";

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog
} from "@angular/material";
import { fuseAnimations } from "../../../../core/animations";

@Component({
  selector: "app-sales-history-detail",
  templateUrl: "./sales-history-detail.component.html",
  styleUrls: ["./sales-history-detail.component.scss"]
})
export class SalesHistoryDetailComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject();

  // Table data
  //dataSource = new MatTableDataSource();
  // Columns to show in the table
  displayedColumns = [
    "timestamp",
    "type",
    "concept",
    "value",
    "pocket",
    "user"
  ];

  userRoles: any;
  isAdmin: Boolean = false;

  selectedSaleHistory: any = null;
  selectedCivicaCardReloadConversation: any = null;
  selectedBusiness: any = null;

  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private keycloakService: KeycloakService,
    private activatedRouter: ActivatedRoute,
    private civicaCardSalesHistoryService: CivicaCardSalesHistoryService,
    private salesHistoryDetailService: SalesHistoryDetailService,
    private dialog: MatDialog,
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {
    this.checkIfUserIsAdmin();
    this.loadSaleHistory();
  }

  /**
   * Checks if the user is admin
   */
  async checkIfUserIsAdmin() {
    this.userRoles = await this.keycloakService.getUserRoles(true);
    this.isAdmin = this.userRoles.some(role => role === 'PLATFORM-ADMIN');
  }


  /**
   * Checks if the logged user has admin permissions
   */
  checkIfUserIsAdmin$() {
    return of(this.keycloakService.getUserRoles(true)).pipe(
      map(userRoles => userRoles.some(role => role === 'PLATFORM-ADMIN')),
      tap(isAdmin => {
        this.isAdmin = isAdmin;
      })
    );
  }


  /**
   * Loads the sale history according to the url param
   */
  loadSaleHistory() {
    this.activatedRouter.params
      .pipe(
        mergeMap(params => {
          return this.getSaleHistoryById$(params.id)
        }),
        mergeMap(saleHistory => {
          return this.getBusinessById$(saleHistory.businessId)
          .pipe(
            map(business => [saleHistory, business])
          );
        }),
        mergeMap(([saleHistory, business]) => {
          return this.checkIfUserIsAdmin$()
          .pipe(
            mergeMap(isAdmin =>{
              return isAdmin ? this.getCivicaCardReloadConversation$(saleHistory.conversationId): of(null)
            }),
            map(conversation => [saleHistory, business, conversation])
          )
        })
      )
      .subscribe(([saleHistory, business, conversation]) => {
        this.selectedSaleHistory = {
          ...saleHistory,
          terminal: saleHistory.terminal || {}
        };
        this.selectedSaleHistory.terminal = {
          id: this.selectedSaleHistory.terminal.id || " ",
          userId: this.selectedSaleHistory.terminal.userId || " ",
          username: this.selectedSaleHistory.terminal.username || " "
        };
        this.selectedBusiness = business;      
        
        if(conversation){
          this.selectedCivicaCardReloadConversation = JSON.parse(conversation);
        }else{
          this.selectedCivicaCardReloadConversation = null;
        }        
      });
  }

  printInvoice(){
    this.dialog
    //Opens confirm dialog
    .open(PrintDialogComponent, {
      data: {saleHistoryId: this.selectedSaleHistory._id}
    })
    .afterClosed()
    .pipe(filter(print => print))
    .subscribe(print => {
      console.log('print => ', print);
      if(print){

      }
    })

    // const invoiceIds = ['101', '102'];
    // this.salesHistoryDetailService
    //   .printDocument('invoice', invoiceIds);
  }

  /**
   * get the business by id
   * @returns {Observable}
   */
  getBusinessById$(id) {
    return this.civicaCardSalesHistoryService
      .getBusinessById$(id)
      .pipe(map((res: any) => res.data.getBusinessById));
  }

  /**
   * get the sale history by its id
   * @param id civica card reload Id
   * @returns {Observable}
   */
  getSaleHistoryById$(id){
    return this.salesHistoryDetailService
    .getSaleHistoryById$(id)
    .pipe(
      map(saleHistory => {
        return saleHistory.data.civicaCardSaleHistory;
      })
    );
  }

  /**
   * get civica card reload conversation
   * @returns {Observable}
   */
  getCivicaCardReloadConversation$(id) {
    return this.salesHistoryDetailService
      .getCivicaCardReloadConversation$(id)
      .pipe(map((res: any) => res.data.civicaCardReloadConversation));
  }

  /**
   * Receives the selected sale history
   * @param saleHistory selected sale history
   */
  selectSaleHistoryRow(saleHistory) {
    this.selectedSaleHistory = saleHistory;
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
