import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Injector } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialDependencyModule } from './material-dependency.module';
import { AfccReloaderComponent } from './afcc-reloader/afcc-reloader.component';
import { createCustomElement } from '@angular/elements';
import { HttpClientModule } from '@angular/common/http';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { BluetoothConnectionComponent } from './afcc-reloader/bluetooth-connection/bluetooth-connection.component';
import { AfccInfoComponent } from './afcc-reloader/afcc-info/afcc-info.component';
import { ReadCardComponent } from './afcc-reloader/read-card/read-card.component';
import { ReadCardErrorComponent } from './afcc-reloader/read-card-error/read-card-error.component';
import { InternalErrorComponent } from './afcc-reloader/internal-error/internal-error.component';
import { ReloadCardComponent } from './afcc-reloader/reload-card/reload-card.component';
import { ReloadCardErrorComponent } from './afcc-reloader/reload-card-error/reload-card-error.component';
import { ReloadCardAbortedComponent } from './afcc-reloader/reload-card-aborted/reload-card-aborted.component';
import { ReloadCardSuccessfullyComponent } from './afcc-reloader/reload-card-successfully/reload-card-successfully.component';
import { BackButtonDialogComponent } from './afcc-reloader/back-button-dialog/back-button-dialog.component';
import { AngularBleModule } from '@nebulae/angular-ble';
import { AfccIdleComponent } from './afcc-reloader/afcc-idle/afcc-idle.component';
import { CurrencyMaskModule } from "ng2-currency-mask";
import { FormsModule } from '@angular/forms';
import { UnknownPositionComponent } from './afcc-reloader/unknown-position/unknown-position.component';
import { ApolloModule } from 'apollo-angular';
import { HttpLinkModule } from 'apollo-angular-link-http';
import { ReloadConfirmationDialogComponent } from './afcc-reloader/read-card/reload-confirmation-dialog/reload-confirmation-dialog.component';
import { ReloadCardRefusedComponent } from './afcc-reloader/reload-card-refused/reload-card-refused.component';

@NgModule({
  declarations: [
    AfccReloaderComponent,
    BluetoothConnectionComponent,
    AfccInfoComponent,
    ReadCardComponent,
    ReadCardErrorComponent,
    InternalErrorComponent,
    ReloadCardComponent,
    ReloadCardErrorComponent,
    ReloadCardAbortedComponent,
    ReloadCardSuccessfullyComponent,
    BackButtonDialogComponent,
    ReloadConfirmationDialogComponent,
    ReloadCardRefusedComponent,
    AfccIdleComponent,
    UnknownPositionComponent
  ],
  imports: [
    ApolloModule,
    BrowserModule,
    BrowserAnimationsModule,
    MaterialDependencyModule,
    HttpClientModule,
    AngularSvgIconModule,
    AngularBleModule.forRoot({
      enableTracing: true
    }),
    CurrencyMaskModule,
    FormsModule,
    HttpLinkModule
  ],
  entryComponents: [
    AfccReloaderComponent,
    ReloadConfirmationDialogComponent,
    BackButtonDialogComponent
  ]
})
export class AppModule {
  constructor(private injector: Injector) {
    const afccReloader = createCustomElement(AfccReloaderComponent, { injector });
    customElements.define('afcc-reloader', afccReloader);
  }

  ngDoBootstrap() {}
 }
