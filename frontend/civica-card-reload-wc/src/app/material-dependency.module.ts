import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatButtonModule,
  MatIconModule,
  MatInputModule,
  MatDividerModule,
  MatDialogModule,
  MatSnackBarModule,
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
    MatCardModule,
    MatListModule
  ],
  declarations: []
})
export class MaterialDependencyModule {}
