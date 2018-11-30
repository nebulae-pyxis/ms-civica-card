////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ViewChild,
  ElementRef
} from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from "@angular/forms";

////////// RXJS ///////////
// tslint:disable-next-line:import-blacklist
import * as Rx from "rxjs/Rx";
import {
  map,
  mergeMap,
  switchMap,
  toArray,
  filter,
  tap,
  takeUntil,
  startWith,
  debounceTime,
  distinctUntilChanged,
  take
} from "rxjs/operators";
import { Subject, fromEvent, of, forkJoin, Observable, concat } from "rxjs";

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar
} from "@angular/material";
import { fuseAnimations } from "../../../../core/animations";

//////////// i18n ////////////
import { FuseTranslationLoaderService } from "../../../../core/services/translation-loader.service";
import {
  TranslateService,
  LangChangeEvent,
  TranslationChangeEvent
} from "@ngx-translate/core";
import { locale as english } from "../i18n/en";
import { locale as spanish } from "../i18n/es";

//////////// Services ////////////
import { KeycloakService } from "keycloak-angular";
import { CivicaCardSalesHistoryService } from "./../civica-card-sales-history.service";
import { SaleHistoryService } from "./sale-history.service";
import { MAT_MOMENT_DATE_FORMATS } from "./my-date-format";

import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MomentDateAdapter
} from "@coachcare/datepicker";

import * as moment from "moment";

@Component({
  selector: "app-sale-history",
  templateUrl: "./sale-history.component.html",
  styleUrls: ["./sale-history.component.scss"],
  animations: fuseAnimations,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: "es" },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE]
    },
    { provide: MAT_DATE_FORMATS, useValue: MAT_MOMENT_DATE_FORMATS }
  ]
})
export class SaleHistoryComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject();

  businessFilterCtrl: FormControl;
  filterForm: FormGroup;
  // Table data
  dataSource = new MatTableDataSource();
  
  // Columns to show in the table
  displayedColumns = [
    "timestamp",
    "value",
    "consolidatedBalance",
    "posTerminal",
    "posId",
    "posUserId",
    "posUsername",
    "user"
  ];


  myBusiness: any = null;
  allBusiness: any = [];
  selectedBusinessData: any = null;
  selectedBusinessName: any = "";
  selectedSaleHistory: any = null;
  isSystemAdmin: Boolean = false;

  businessQueryFiltered$: Observable<any[]>;

  maxEndDate: any = null;
  minEndDate: any = null;

  // Table values
  @ViewChild(MatPaginator)
  paginator: MatPaginator;
  @ViewChild("filter")
  filter: ElementRef;
  @ViewChild(MatSort)
  sort: MatSort;
  tableSize: number;
  page = 0;
  count = 10;
  filterText = "";
  sortColumn = null;
  sortOrder = null;
  itemPerPage = "";
  //Indicates if there are new transactions 
  outdatedData = false;


  constructor(
    private formBuilder: FormBuilder,
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private keycloakService: KeycloakService,
    private civicaCardSalesHistoryService: CivicaCardSalesHistoryService,
    private saleHistoryService: SaleHistoryService,
    private adapter: DateAdapter<any>
  ) {
    this.translationLoader.loadTranslations(english, spanish);
    this.businessFilterCtrl = new FormControl();
  }

  ngOnInit() {
    console.log('sale history => onInit1');
    this.buildFilterForm();
    this.onLangChange();
    this.loadBusinessFilter();
    this.detectFilterAndPaginatorChanges();
    this.loadDataInForm();
    this.loadRoleData();
    this.refreshTransactionHistoryTable();
  }

  buildFilterForm() {
    const startOfMonth = moment().startOf("month");
    const endOfMonth = moment().endOf("day");
    this.minEndDate = startOfMonth;
    this.maxEndDate = endOfMonth;
    // Reactive Form
    this.filterForm = this.formBuilder.group({
      initDate: [startOfMonth],
      endDate: [endOfMonth],
      terminalId: [""],
      terminalPosId: [""],
      terminalUserId: [""],
      terminalUsername: [""],
      user: [""]
    });
    this.filterForm.disable({
      onlySelf: true,
      emitEvent: false
    });
  }

  compareIds(business1: any, business2: any): boolean {
    return business1 && business2
      ? business1._id === business2._id
      : business1 === business2;
  }

  compareTypes(type1: any, type2: any): boolean {
    return type1 && type2 ? type1.type === type2.type : type1 === type2;
  }

  displayFn(business) {
    return ((business || {}).generalInfo || {}).name;
  }

  loadDataInForm() {
    Rx.Observable.combineLatest(
      this.saleHistoryService.filterAndPaginator$,
      this.saleHistoryService.selectedBusinessEvent$
    )
      .pipe(take(1))
      .subscribe(([filterAndPaginator, selectedBusiness]) => {
        if (filterAndPaginator) {
          if (filterAndPaginator.filter) {
            const filterData: any = filterAndPaginator.filter;
            const terminal: any = filterAndPaginator.filter.terminal || {};

            this.filterForm.patchValue({
              initDate: filterData.initDate,
              endDate: filterData.endDate,
              terminalId: terminal.id,
              terminalUserId: terminal.userId,
              terminalUsername: terminal.username,
              terminalPosId: terminal.posId,
              user: filterData.user
            });
          }

          if (filterAndPaginator.pagination) {
            (this.page = filterAndPaginator.pagination.page),
              (this.count = filterAndPaginator.pagination.count);
          }
        }

        if (selectedBusiness) {
          this.selectedBusinessData = selectedBusiness;
          this.businessFilterCtrl.setValue(this.selectedBusinessData);
        }
        this.filterForm.enable({ emitEvent: true });
        this.outdatedData = false;
      });
  }

  /**
   * Paginator of the table
   */
  getPaginator$() {
    return this.paginator.page.pipe(startWith({ pageIndex: 0, pageSize: 10 }));
  }

  /**
   * Changes the internationalization of the dateTimePicker component
   */
  onLangChange() {
    this.translate.onLangChange
      .pipe(
        startWith({ lang: this.translate.currentLang }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(event => {
        if (event) {
          this.adapter.setLocale(event.lang);
        }
      });
  }


  /**
   *
   * @param element Element HTML
   */
  getFormChanges$() {
    return this.filterForm.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    );
  }

  onInitDateChange() {
    const start = this.filterForm.get("initDate").value;
    const end = this.filterForm.get("endDate").value;

    const startMonth = start.month();
    const startYear = start.year();
    const startMonthYear = startMonth + "-" + startYear;

    const endMonth = end.month();
    const endYear = end.year();
    const endMonthYear = endMonth + "-" + endYear;

    this.minEndDate = moment(start);
    if (startMonthYear != endMonthYear) {
      console.log("Select last day of month or current date");
      this.filterForm.patchValue({
        endDate: start.endOf("month")
      });
      this.maxEndDate = start.endOf("month");
    } else {
      console.log("Same month");
    }

    console.log(
      "minEndDate => ",
      this.minEndDate.format("MMMM Do YYYY, h:mm:ss a")
    );
    console.log(
      "maxEndDate => ",
      this.maxEndDate.format("MMMM Do YYYY, h:mm:ss a")
    );
  }

  onEndDateChange() {
    // const start = this.filterForm.get('initDate').value;
    // this.minEndDate = moment(start);
  }

  resetFilter() {
    this.filterForm.reset();
    this.paginator.pageIndex = 0;
    this.page = 0;
    this.count = 10;

    const startOfMonth = moment().startOf("month");
    const endOfMonth = moment().endOf("day");
    this.filterForm.patchValue({
      initDate: startOfMonth,
      endDate: endOfMonth
    });
    this.outdatedData = false;
  }

  detectFilterAndPaginatorChanges() {
    Rx.Observable.combineLatest(this.getFormChanges$(), this.getPaginator$())
      .pipe(
        filter(data => {
          return this.filterForm.enabled;
        }),
        map(([formChanges, paginator]) => {
          console.log("detectFilterAndPaginatorChanges2 => ", formChanges);

          const data = {
            filter: {
              initDate: formChanges.initDate,
              endDate: formChanges.endDate,
              // transactionType: {type: 'SALE', concepts: ['ADIOS']},
              transactionConcept: formChanges.transactionConcept,
              terminal: {
                id: formChanges.terminalId,
                userId: formChanges.terminalUserId,
                username: formChanges.terminalUsername,
                posId: formChanges.terminalPosId
              }
            },
            pagination: {
              page: paginator.pageIndex,
              count: paginator.pageSize,
              sort: -1
            }
          };

          data.filter["transactionTypeData"] = formChanges.transactionType;
          return data;
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(filterAndPagination => {
        this.saleHistoryService.addFilterAndPaginatorData(
          filterAndPagination
        );
      });
  }

  /**
   * Refreshes the table data according to the filters and the paginator.
   */
  refreshTransactionHistoryTable() {
    Rx.Observable.combineLatest(
      this.saleHistoryService.filterAndPaginator$,
      this.saleHistoryService.selectedBusinessEvent$
    )
      .pipe(
        filter(([filterAndPagination, selectedBusiness]) => {
          console.log('refreshTable => ', ([filterAndPagination, selectedBusiness]));
          return filterAndPagination != null && selectedBusiness != null;
        }),
        map(([filterAndPagination, selectedBusiness]) => {
          const CivicaSaleFilterInput: any = {
            businessId: selectedBusiness._id,
            initDate: filterAndPagination.filter.initDate
              ? filterAndPagination.filter.initDate.valueOf()
              : null,
            endDate: filterAndPagination.filter.endDate
              ? filterAndPagination.filter.endDate.valueOf()
              : null,
            transactionType: filterAndPagination.filter.transactionTypeData
              ? filterAndPagination.filter.transactionTypeData.type
              : undefined,
            transactionConcept: filterAndPagination.filter.transactionConcept,
            terminal: filterAndPagination.filter.terminal
          };

          const CivicaSalePaginationInput = filterAndPagination.pagination;
          return [CivicaSaleFilterInput, CivicaSalePaginationInput];
        }),
        mergeMap(([CivicaSaleFilterInput, CivicaSalePaginationInput]) => {
          return forkJoin(
            this.saleHistoryService
              .getSalesHistory$(CivicaSaleFilterInput, CivicaSalePaginationInput)
              .pipe(mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp))),
            this.saleHistoryService
              .getSalesHistoryAmount$(CivicaSaleFilterInput)
              .pipe(mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)))
          );
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(([salesHistory, salesHistoryAmount]) => {
        this.outdatedData = false;
        
        console.log('salesHistory.data.civicaCardSalesHistory => ', salesHistoryAmount);

        if(salesHistory.data && salesHistory.data.civicaCardSalesHistory){
          this.dataSource.data = salesHistory.data.civicaCardSalesHistory;
        }

        if(salesHistoryAmount.data && salesHistoryAmount.data.civicaCardSalesHistoryAmount){
          this.tableSize = salesHistoryAmount.data.civicaCardSalesHistoryAmount;
        }              
      });
  }

  /**
   *
   */
  loadRoleData() {
    this.checkIfUserIsAdmin$()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(hasSysAdminRole => {
        this.isSystemAdmin = hasSysAdminRole;
      });
  }

  /**
   * Creates the transaction history filter
   */
  createTransactionHistoryFilterForm() {
    return this.formBuilder.group({});
  }

  /**
   * Checks if the logged user has role SYSADMIN
   */
  checkIfUserIsAdmin$() {
    return Rx.Observable.of(this.keycloakService.getUserRoles(true)).pipe(
      map(userRoles => userRoles.some(role => role === "SYSADMIN" || role === "platform-admin")),
      tap(isAdmin => {
        this.isSystemAdmin = isAdmin;
      })
    );
  }

  loadBusinessFilter() {
    console.log('loadBusinessFilter');
    this.businessQueryFiltered$ = this.checkIfUserIsAdmin$().pipe(
      mergeMap(isAdmin => {
        console.log("loadBusinessFilter1 => ", isAdmin);
        if (isAdmin) {
          return this.businessFilterCtrl.valueChanges.pipe(
            startWith(undefined),
            debounceTime(500),
            distinctUntilChanged(),
            mergeMap((filterText: String) => {
              return this.getBusinessFiltered(filterText, 20);
            })
          );
        } else {
          return this.getBusiness$().pipe(
            tap(business => {
              // this.myBusiness = business;
              console.log(' -------------- business ', business);
              
              this.selectedBusinessData = business;
              this.selectedBusinessName = this.selectedBusinessData.generalInfo.name;
              this.onSelectBusinessEvent(this.selectedBusinessData);
            }),
            filter(business => business != null),
            toArray()
          );
        }
      })
      // tap(data => console.log('loadBusinessFilter2 => ', data))
    );
  }

  getBusinessFiltered(filterText: String, limit: number): Observable<any[]> {
    return this.civicaCardSalesHistoryService.getBusinessByFilter(filterText, limit).pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      filter(resp => !resp.errors),
      mergeMap(result => Observable.from(result.data.getBusinessByFilterText)),
      toArray()
    );
  }

  /**
   * get the business which the user belongs
   */
  getBusiness$() {
    return this.civicaCardSalesHistoryService
      .getMyBusiness$()
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter(resp => !resp.errors),
        map(res => res.data.myBusiness)
      );
  }

  /**
   * Receives the selected sale history
   * @param saleHistory selected sale history
   */
  selectSaleHistoryRow(saleHistory) {
    this.selectedSaleHistory = saleHistory;
  }

  /**
   * Listens when a new business have been selected
   * @param business  selected business
   */
  onSelectBusinessEvent(business) {
    // console.log('onSelectBusinessEvent => ', business);
    this.saleHistoryService.selectBusiness(business);
  }

  graphQlAlarmsErrorHandler$(response) {
    return Rx.Observable.of(JSON.parse(JSON.stringify(response))).pipe(
      tap((resp: any) => {
        this.showSnackBarError(resp);
        return resp;
      })
    );
  }

  /**
   * Shows an error snackbar
   * @param response
   */
  showSnackBarError(response) {
    // console.log('showSnackBarError => ', response);
    if (response.errors) {
      if (Array.isArray(response.errors)) {
        response.errors.forEach(error => {
          if (Array.isArray(error)) {
            error.forEach(errorDetail => {
              this.showMessageSnackbar("ERRORS." + errorDetail.message.code);
            });
          } else {
            response.errors.forEach(errorData => {
              this.showMessageSnackbar("ERRORS." + errorData.message.code);
            });
          }
        });
      }
    }
  }

  /**
   * Shows a message snackbar on the bottom of the page
   * @param messageKey Key of the message to i18n
   * @param detailMessageKey Key of the detail message to i18n
   */
  showMessageSnackbar(messageKey, detailMessageKey?) {
    const translationData = [];
    if (messageKey) {
      translationData.push(messageKey);
    }

    if (detailMessageKey) {
      translationData.push(detailMessageKey);
    }

    this.translate.get(translationData).subscribe(data => {
      this.snackBar.open(
        messageKey ? data[messageKey] : "",
        detailMessageKey ? data[detailMessageKey] : "",
        {
          duration: 2000
        }
      );
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
