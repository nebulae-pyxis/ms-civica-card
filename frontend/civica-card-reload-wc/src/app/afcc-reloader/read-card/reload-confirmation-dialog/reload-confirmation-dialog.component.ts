import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, } from '@angular/material';
import * as Rx from 'rxjs';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'reload-confirmation-dialog.component',
  templateUrl: './reload-confirmation-dialog.component.html',
  styleUrls: ['./reload-confirmation-dialog.component.scss']
})
export class ReloadConfirmationDialogComponent implements OnInit {
  reloadValue;
  constructor(
    private dialogRef: MatDialogRef<ReloadConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.reloadValue = this.data;
  }

  yesAction() {
    this.dialogRef.close(true);
  }

  noAction() {
    this.dialogRef.close(false);
  }
}
