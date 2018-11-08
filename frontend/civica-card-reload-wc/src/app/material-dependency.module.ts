import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatButtonModule,
  MatIconModule,
  MatInputModule,
  MatDividerModule,
  MatDialogModule,
  MatSnackBarModule,
  MatProgressBarModule,
  MatCardModule,
  MatListModule
} from '@angular/material';
@NgModule({
  imports: [
    CommonModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatCardModule,
    MatListModule
  ],
  exports: [
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatCardModule,
    MatListModule
  ],
  declarations: []
})
export class MaterialDependencyModule {}
