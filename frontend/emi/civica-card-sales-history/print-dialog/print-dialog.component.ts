import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { SalesHistoryDetailService } from '../sales-history-detail/sales-history-detail.service';

////////// RXJS ///////////
import { map, mergeMap, toArray } from 'rxjs/operators';
import { of } from 'rxjs';

export interface DialogData {
  dialogTitle: string;
  dialogMessage: string;
}

@Component({
  selector: 'app-print-dialog.component',
  templateUrl: './print-dialog.component.html',
  styleUrls: ['./print-dialog.component.scss']
})
export class PrintDialogComponent implements OnInit {
  receipt: any = {};

  constructor(
    private dialogRef: MatDialogRef<PrintDialogComponent>,
    private salesHistoryDetailService: SalesHistoryDetailService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit() {
    this.loadReceiptData();
  }

  loadReceiptData() {
    of(this.data)
      .pipe(
        mergeMap((data: any) => {
          return this.getSaleHistoryById$(data.saleHistoryId);
        })
      )
      .subscribe(res => {
        this.receipt = res.receipt;
        // this.printInvoice();
      });
  }

  /**
   * get the sale history by its id
   * @param id civica card reload Id
   * @returns {Observable}
   */
  getSaleHistoryById$(id) {
    return this.salesHistoryDetailService.getSaleHistoryById$(id).pipe(
      map(saleHistory => {
        return saleHistory.data.civicaCardSaleHistory;
      })
    );
  }

  printInvoice() {
    let printContent;
    printContent = document.getElementById('print-section');
    const WindowPrt = window.open('', '', 'left=0,top=0,width=900,height=900,toolbar=0,scrollbars=0,status=0');
    WindowPrt.document.write(printContent.innerHTML);
    WindowPrt.document.close();
    WindowPrt.focus();
    WindowPrt.print();
    WindowPrt.close();

    // const frame1: any = document.createElement('iframe');
    // frame1.name = 'frame3';
    // frame1.style.position = 'absolute';
    // frame1.style.top = '-1000000px';
    // document.body.appendChild(frame1);
    // const frameDoc = frame1.contentWindow
    //   ? frame1.contentWindow
    //   : frame1.contentDocument.document
    //   ? frame1.contentDocument.document
    //   : frame1.contentDocument;
    // frameDoc.document.open();
    // frameDoc.document.write(`
    // <html>
    //   <head>
    //     <title>Print tab</title>
    //   </head>
    // <body>${printContents}</body>
    // </html>`);
    // setTimeout(function() {
    //   window.frames['frame3'].focus();
    //   window.frames['frame3'].print();
    //   document.body.removeChild(frame1);
    // }, 500);
    return false;

    // popupWin = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');
    // popupWin.document.open();
    // popupWin.document.write(`
    //   <html>
    //     <head>
    //       <title>Print tab</title>
    //     </head>
    //   <body onload="window.print();window.close()">${printContents}</body>
    //   </html>`
    // );
    // popupWin.document.close();
    // this.dialogRef.close(true);
  }

  close() {
    console.log('Close dialog');
  }
}
