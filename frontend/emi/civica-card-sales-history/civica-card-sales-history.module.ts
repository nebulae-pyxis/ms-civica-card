import { CivicaCardSalesHistoryService } from './civica-card-sales-history.service';
import { SaleHistoryService } from './sales-history/sale-history.service';
import { SaleHistoryComponent } from './sales-history/sale-history.component';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

const routes: Routes = [
  {
    path: '',
    component: SaleHistoryComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    SaleHistoryComponent
  ],
  providers: [CivicaCardSalesHistoryService, SaleHistoryService],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
})

export class CivicaCardSalesHistoryModule {}
