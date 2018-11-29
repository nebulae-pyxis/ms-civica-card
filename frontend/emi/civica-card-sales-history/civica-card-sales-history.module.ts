import { CivicaCardSalesHistoryService } from './civica-card-sales-history.service';
import { SaleHistoryService } from './sales-history/sale-history.service';
import { SaleHistoryComponent } from './sales-history/sale-history.component';
import { SalesHistoryDetailService } from './sales-history-detail/sales-history-detail.service';
import { SalesHistoryDetailComponent } from './sales-history-detail/sales-history-detail.component';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';
import { NgxJsonViewerModule } from 'ngx-json-viewer';

const routes: Routes = [
  {
    path: '',
    component: SaleHistoryComponent,
  },
  {
    path: ':id',
    component: SalesHistoryDetailComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule,
    NgxJsonViewerModule
  ],
  declarations: [
    SaleHistoryComponent, SalesHistoryDetailComponent
  ],
  providers: [CivicaCardSalesHistoryService, SaleHistoryService, SalesHistoryDetailService],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
})

export class CivicaCardSalesHistoryModule {}
