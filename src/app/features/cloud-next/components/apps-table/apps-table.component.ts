import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTable } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { SelectionModel } from '@angular/cdk/collections';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { CloudNextApp } from '../../models/cloud-next-app.model';
import { StatusChipComponent } from '../status-chip/status-chip.component';
import { MetadataViewComponent } from '../metadata-view/metadata-view.component';

@Component({
  selector: 'app-apps-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatCardModule,
    StatusChipComponent,
    MetadataViewComponent
  ],
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  template: `
    <mat-card>
      <!-- Header with Search -->
      <mat-card-header class="border-b border-gray-200 pb-4">
        <mat-card-title class="flex items-center justify-between w-full">
          <span>Applications</span>
          <mat-form-field appearance="outline" class="w-64" subscriptSizing="dynamic">
            <mat-icon matPrefix>search</mat-icon>
            <input
              matInput
              placeholder="Search apps..."
              [(ngModel)]="searchValue"
              (ngModelChange)="onSearch($event)">
            @if (searchValue) {
              <button matSuffix mat-icon-button (click)="clearSearch()">
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>
        </mat-card-title>
      </mat-card-header>

      <mat-card-content class="pt-0">
        <!-- Table -->
        <table mat-table [dataSource]="apps" multiTemplateDataRows class="w-full">

          <!-- Checkbox Column -->
          <ng-container matColumnDef="select">
            <th mat-header-cell *matHeaderCellDef class="w-12">
              <mat-checkbox
                (change)="$event ? toggleAllRows() : null"
                [checked]="selection.hasValue() && isAllSelected()"
                [indeterminate]="selection.hasValue() && !isAllSelected()">
              </mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let row">
              <mat-checkbox
                (click)="$event.stopPropagation()"
                (change)="$event ? selection.toggle(row) : null"
                [checked]="selection.isSelected(row)">
              </mat-checkbox>
            </td>
          </ng-container>

          <!-- App ID Column -->
          <ng-container matColumnDef="appId">
            <th mat-header-cell *matHeaderCellDef>App ID</th>
            <td mat-cell *matCellDef="let row" class="font-medium">{{ row.appId }}</td>
          </ng-container>

          <!-- App Name Column -->
          <ng-container matColumnDef="appName">
            <th mat-header-cell *matHeaderCellDef>App Name</th>
            <td mat-cell *matCellDef="let row">{{ row.appName }}</td>
          </ng-container>

          <!-- Owner Column -->
          <ng-container matColumnDef="owner">
            <th mat-header-cell *matHeaderCellDef>Owner</th>
            <td mat-cell *matCellDef="let row">{{ row.owner }}</td>
          </ng-container>

          <!-- Unity Project Column -->
          <ng-container matColumnDef="unityProject">
            <th mat-header-cell *matHeaderCellDef>Unity Project</th>
            <td mat-cell *matCellDef="let row">
              @if (row.unityProject) {
                {{ row.unityProject }}
              } @else {
                <span class="text-gray-400">—</span>
              }
            </td>
          </ng-container>

          <!-- Metadata Column -->
          <ng-container matColumnDef="metadata">
            <th mat-header-cell *matHeaderCellDef>Metadata</th>
            <td mat-cell *matCellDef="let row">
              <button
                mat-button
                color="primary"
                (click)="toggleRow(row); $event.stopPropagation()">
                <mat-icon>visibility</mat-icon>
                View
              </button>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let row">
              <app-status-chip [status]="row.status"></app-status-chip>
            </td>
          </ng-container>

          <!-- Expand Column -->
          <ng-container matColumnDef="expand">
            <th mat-header-cell *matHeaderCellDef class="w-12"></th>
            <td mat-cell *matCellDef="let row">
              <button
                mat-icon-button
                (click)="toggleRow(row); $event.stopPropagation()">
                <mat-icon>
                  {{ expandedElement === row ? 'expand_less' : 'expand_more' }}
                </mat-icon>
              </button>
            </td>
          </ng-container>

          <!-- Expanded Detail Row -->
          <ng-container matColumnDef="expandedDetail">
            <td mat-cell *matCellDef="let row" [attr.colspan]="displayedColumns.length">
              <div class="overflow-hidden" [@detailExpand]="row === expandedElement ? 'expanded' : 'collapsed'">
                <div class="px-4 bg-gray-50">
                  <app-metadata-view
                    [metadata]="row.cloudNextMetadata"
                    (edit)="editMetadata.emit(row)">
                  </app-metadata-view>
                </div>
              </div>
            </td>
          </ng-container>

          <!-- Header and Row Declarations -->
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: displayedColumns;"
            class="cursor-pointer hover:bg-gray-50"
            [class.bg-gray-50]="expandedElement === row"
            (click)="selection.toggle(row)">
          </tr>
          <tr
            mat-row
            *matRowDef="let row; columns: ['expandedDetail']"
            class="detail-row">
          </tr>

          <!-- No Data Row -->
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell text-center py-8 text-gray-500" [attr.colspan]="displayedColumns.length">
              @if (searchValue) {
                No apps found matching "{{ searchValue }}"
              } @else {
                No apps available
              }
            </td>
          </tr>
        </table>

        <!-- Paginator -->
        <mat-paginator
          [length]="totalCount"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 25, 50]"
          (page)="onPageChange($event)"
          showFirstLastButtons>
        </mat-paginator>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .detail-row {
      height: 0;
    }

    tr.mat-mdc-row:not(.detail-row):hover {
      background: #f5f5f5;
    }

    tr.mat-mdc-row:not(.detail-row):active {
      background: #efefef;
    }
  `]
})
export class AppsTableComponent {
  @Input() apps: CloudNextApp[] = [];
  @Input() totalCount = 0;
  @Input() pageSize = 10;

  @Output() search = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();
  @Output() selectionChange = new EventEmitter<CloudNextApp[]>();
  @Output() editMetadata = new EventEmitter<CloudNextApp>();

  displayedColumns = ['select', 'appId', 'appName', 'owner', 'unityProject', 'metadata', 'status', 'expand'];
  selection = new SelectionModel<CloudNextApp>(true, []);
  expandedElement: CloudNextApp | null = null;
  searchValue = '';

  constructor() {
    // Emit selection changes
    this.selection.changed.subscribe(() => {
      this.selectionChange.emit(this.selection.selected);
    });
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.apps.length;
    return numSelected === numRows;
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.apps);
    }
  }

  toggleRow(row: CloudNextApp): void {
    this.expandedElement = this.expandedElement === row ? null : row;
  }

  onSearch(value: string): void {
    this.search.emit(value);
  }

  clearSearch(): void {
    this.searchValue = '';
    this.search.emit('');
  }

  onPageChange(event: PageEvent): void {
    this.pageChange.emit({
      page: event.pageIndex,
      pageSize: event.pageSize
    });
  }
}
