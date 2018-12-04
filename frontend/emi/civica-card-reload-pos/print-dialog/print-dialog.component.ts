import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

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
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit() {
    this.receipt = this.data;
  }

  printInvoice() {
    const printContents = document.getElementById('print-section').innerHTML;

    const frame1: any = document.createElement('iframe');
    frame1.name = 'frame3';
    frame1.style.position = 'absolute';
    frame1.style.top = '-1000000px';
    document.body.appendChild(frame1);
    const frameDoc = frame1.contentWindow
      ? frame1.contentWindow
      : frame1.contentDocument.document
      ? frame1.contentDocument.document
      : frame1.contentDocument;
    frameDoc.document.open();
    frameDoc.document.write(`
    <html>
      <head>
        <title>Print tab</title>
      </head>
    <body>${printContents}</body>
    </html>`);
    setTimeout(function() {
      window.frames['frame3'].focus();
      window.frames['frame3'].print();
      document.body.removeChild(frame1);
    }, 500);
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
