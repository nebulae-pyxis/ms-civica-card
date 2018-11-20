import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { CivicaCardReloadPosService } from './civica-card-reload-pos.service';
import { CivicaCardReloadPosComponent } from './civica-card-reload-pos.component';

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
    FuseWidgetModule
  ],
  declarations: [
    CivicaCardReloadPosComponent
  ],
  providers: [CivicaCardReloadPosService, DatePipe],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
})

export class CivicaCardReloadPosModule {}
