import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { mergeMap, tap, mapTo, first } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material';
import * as Rx from 'rxjs';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'back-button-dialog.component',
  templateUrl: './back-button-dialog.component.html',
  styleUrls: ['./back-button-dialog.component.scss']
})
export class BackButtonDialogComponent implements OnInit {
  constructor(
    private dialogRef: MatDialogRef<BackButtonDialogComponent>,
  ) {}

  ngOnInit() {
  }

  yesAction() {
    this.dialogRef.close(true);
  }

  noAction() {
    this.dialogRef.close(false);
  }
}
