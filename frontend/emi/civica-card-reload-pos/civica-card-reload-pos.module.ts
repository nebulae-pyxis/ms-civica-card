import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { CivicaCardReloadPosService } from './civica-card-reload-pos.service';
import { CivicaCardReloadPosComponent } from './civica-card-reload-pos.component';
import { AfccRealoderService } from './reloader-wc/afcc-realoder.service';
import { AfccReloaderComponent } from './reloader-wc/afcc-reloader/afcc-reloader.component';
import { ReloadConfirmationDialogComponent } from './reloader-wc/afcc-reloader/read-card/reload-confirmation-dialog/reload-confirmation-dialog.component';
import { BluetoothConnectionComponent } from './reloader-wc/afcc-reloader/bluetooth-connection/bluetooth-connection.component';
import { AfccInfoComponent } from './reloader-wc/afcc-reloader/afcc-info/afcc-info.component';
import { ReadCardComponent } from './reloader-wc/afcc-reloader/read-card/read-card.component';
import { ReadCardErrorComponent } from './reloader-wc/afcc-reloader/read-card-error/read-card-error.component';
import { InternalErrorComponent } from './reloader-wc/afcc-reloader/internal-error/internal-error.component';
import { ReloadCardComponent } from './reloader-wc/afcc-reloader/reload-card/reload-card.component';
import { ReloadCardErrorComponent } from './reloader-wc/afcc-reloader/reload-card-error/reload-card-error.component';
import { ReloadCardAbortedComponent } from './reloader-wc/afcc-reloader/reload-card-aborted/reload-card-aborted.component';
import { ReloadCardSuccessfullyComponent } from './reloader-wc/afcc-reloader/reload-card-successfully/reload-card-successfully.component';
import { BackButtonDialogComponent } from './reloader-wc/afcc-reloader/back-button-dialog/back-button-dialog.component';
import { ReloadCardRefusedComponent } from './reloader-wc/afcc-reloader/reload-card-refused/reload-card-refused.component';
import { AfccIdleComponent } from './reloader-wc/afcc-reloader/afcc-idle/afcc-idle.component';
import { UnknownPositionComponent } from './reloader-wc/afcc-reloader/unknown-position/unknown-position.component';
import { CurrencyMaskModule } from 'ng2-currency-mask';
import { AngularBleModule } from '@nebulae/angular-ble';
import { AngularSvgIconModule } from 'angular-svg-icon';

const routes: Routes = [
  {
    path: '',
    component: CivicaCardReloadPosComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule,
    AngularBleModule.forRoot({
      enableTracing: false
    }),
    AngularSvgIconModule,
    CurrencyMaskModule,
  ],
  declarations: [
    CivicaCardReloadPosComponent,
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
  providers: [CivicaCardReloadPosService, DatePipe, AfccRealoderService],
  entryComponents: [
    ReloadConfirmationDialogComponent,
    BackButtonDialogComponent
  ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
})

export class CivicaCardReloadPosModule {}
