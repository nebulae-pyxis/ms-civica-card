import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { civicaCardService } from './civica-card.service';
import { civicaCardComponent } from './civica-card.component';

const routes: Routes = [
  {
    path: '',
    component: civicaCardComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    civicaCardComponent
  ],
  providers: [civicaCardService, DatePipe],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
})

export class civicaCardModule {}
