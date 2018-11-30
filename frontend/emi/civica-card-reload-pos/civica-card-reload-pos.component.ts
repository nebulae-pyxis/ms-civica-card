import { CivicaCardReloadPosService } from './civica-card-reload-pos.service';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakProfile } from 'keycloak-js';
import { fuseAnimations } from '../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
import * as Rx from 'rxjs/Rx';
import {
  filter,
  switchMap,
  mergeMap,
  map,
  tap,
  takeUntil
} from 'rxjs/operators';
import { concat, Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'civica-card-reload-pos',
  templateUrl: './civica-card-reload-pos.component.html',
  styleUrls: ['./civica-card-reload-pos.component.scss'],
  animations: fuseAnimations
})
export class CivicaCardReloadPosComponent implements OnInit, OnDestroy {
  userDetails: KeycloakProfile = {};
  private ngUnsubscribe = new Subject();
  walletData;
  constructor(
    private civicaCardReloadPosService: CivicaCardReloadPosService,
    private keycloakService: KeycloakService,
    private translate: TranslateService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    this.userDetails = await this.keycloakService.loadUserProfile();
    this.loadWalletData();
    this.startWalletUpdatedSubscription$().subscribe(result => {
      this.walletData = result;
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  startWalletUpdatedSubscription$() {
    return this.civicaCardReloadPosService.getWalletUpdatedSubscription$((this.userDetails as any).attributes.businessId[0]);
  }

  /**
   * get the wallet data according to the selected business
   */
  loadWalletData() {
    this.civicaCardReloadPosService
      .getWallet$((this.userDetails as any).attributes.businessId[0])
      .pipe(
        tap(resp => console.log('Llega respuesta del servidor: ', resp)),
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        map(result => result.data.getWallet),
        map(wallet => {
          let credit = 0;
          if (wallet.pockets.main < 0) {
            credit += wallet.pockets.main;
          }

          if (wallet.pockets.bonus < 0) {
            credit += wallet.pockets.bonus;
          }
          const walletCopy = {
            ...wallet,
            pockets: {
              main: wallet.pockets.main < 0 ? 0 : wallet.pockets.main,
              bonus: wallet.pockets.bonus < 0 ? 0 : wallet.pockets.bonus,
              credit: credit
            }
          };
          return walletCopy;
        }),
        takeUntil(this.ngUnsubscribe)
      ).subscribe(wallet => {
        console.log('new Wallet => ', wallet);
        this.walletData = wallet;
      });
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
              this.showMessageSnackbar('ERRORS.' + errorDetail.message.code);
            });
          } else {
            response.errors.forEach(errorData => {
              this.showMessageSnackbar('ERRORS.' + errorData.message.code);
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
        messageKey ? data[messageKey] : '',
        detailMessageKey ? data[detailMessageKey] : '',
        {
          duration: 2000
        }
      );
    });
  }
}
