import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { SelectionModel } from '@angular/cdk/collections';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { CloudNextApp, CloudNextMetadata } from '../../models/cloud-next-app.model';
import { StatusChipComponent } from '../status-chip/status-chip.component';
import { MetadataViewComponent } from '../metadata-view/metadata-view.component';

type ValidationFilter = 'all' | 'valid' | 'warning' | 'error';
type RegionFilter = 'all' | string;

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
    MatTooltipModule,
    MatChipsModule,
    MatMenuModule,
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
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Applications</h3>
            <p class="text-sm text-gray-500 mt-0.5">
              @if (hasActiveFilters()) {
                {{ filteredApps().length }} of {{ totalCount }} apps
              } @else {
                {{ totalCount }} total apps
              }
            </p>
          </div>
          <div class="flex items-center gap-4">
            <!-- Legend -->
            <div class="hidden md:flex items-center gap-4 text-xs text-gray-500">
              <div class="flex items-center gap-1">
                <mat-icon class="!text-sm text-green-500">check_circle</mat-icon>
                <span>Complete</span>
              </div>
              <div class="flex items-center gap-1">
                <mat-icon class="!text-sm text-amber-500">warning</mat-icon>
                <span>Incomplete</span>
              </div>
              <div class="flex items-center gap-1">
                <mat-icon class="!text-sm text-red-500">error</mat-icon>
                <span>Missing required</span>
              </div>
            </div>
            <!-- Search -->
            <div class="relative">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 !text-lg">search</mat-icon>
              <input
                type="text"
                placeholder="Search apps..."
                class="pl-10 pr-10 py-2 w-64 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                [(ngModel)]="searchValue"
                (ngModelChange)="onSearch($event)">
              @if (searchValue) {
                <button
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  (click)="clearSearch()">
                  <mat-icon class="!text-lg">close</mat-icon>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Filter Chips -->
        <div class="flex flex-wrap items-center gap-2 mt-4">
          <span class="text-xs font-medium text-gray-500 mr-1">Filters:</span>

          <!-- Validation Status Filter -->
          <button
            [matMenuTriggerFor]="validationMenu"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
            [class]="validationFilter() !== 'all'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'">
            <mat-icon class="!text-sm !w-4 !h-4">verified</mat-icon>
            {{ getValidationFilterLabel() }}
            <mat-icon class="!text-sm !w-4 !h-4">arrow_drop_down</mat-icon>
          </button>
          <mat-menu #validationMenu="matMenu">
            <button mat-menu-item (click)="setValidationFilter('all')">
              <span>All</span>
            </button>
            <button mat-menu-item (click)="setValidationFilter('valid')">
              <mat-icon class="text-green-500">check_circle</mat-icon>
              <span>Complete</span>
            </button>
            <button mat-menu-item (click)="setValidationFilter('warning')">
              <mat-icon class="text-amber-500">warning</mat-icon>
              <span>Incomplete</span>
            </button>
            <button mat-menu-item (click)="setValidationFilter('error')">
              <mat-icon class="text-red-500">error</mat-icon>
              <span>Missing Required</span>
            </button>
          </mat-menu>

          <!-- Region Filter -->
          <button
            [matMenuTriggerFor]="regionMenu"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
            [class]="regionFilter() !== 'all'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'">
            <mat-icon class="!text-sm !w-4 !h-4">public</mat-icon>
            {{ getRegionFilterLabel() }}
            <mat-icon class="!text-sm !w-4 !h-4">arrow_drop_down</mat-icon>
          </button>
          <mat-menu #regionMenu="matMenu">
            <button mat-menu-item (click)="setRegionFilter('all')">
              <span>All Regions</span>
            </button>
            @for (region of availableRegions(); track region) {
              <button mat-menu-item (click)="setRegionFilter(region)">
                <span>{{ region }}</span>
              </button>
            }
            <button mat-menu-item (click)="setRegionFilter('none')">
              <mat-icon class="text-gray-400">remove_circle_outline</mat-icon>
              <span>No Region Set</span>
            </button>
          </mat-menu>

          <!-- Unity Project Filter -->
          <button
            [matMenuTriggerFor]="projectMenu"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
            [class]="projectFilter() !== 'all'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'">
            <mat-icon class="!text-sm !w-4 !h-4">folder</mat-icon>
            {{ getProjectFilterLabel() }}
            <mat-icon class="!text-sm !w-4 !h-4">arrow_drop_down</mat-icon>
          </button>
          <mat-menu #projectMenu="matMenu">
            <button mat-menu-item (click)="setProjectFilter('all')">
              <span>All</span>
            </button>
            <button mat-menu-item (click)="setProjectFilter('has')">
              <mat-icon class="text-green-500">check</mat-icon>
              <span>Has Unity Project</span>
            </button>
            <button mat-menu-item (click)="setProjectFilter('missing')">
              <mat-icon class="text-red-500">close</mat-icon>
              <span>Missing Unity Project</span>
            </button>
          </mat-menu>

          <!-- Clear Filters -->
          @if (hasActiveFilters()) {
            <button
              class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              (click)="clearAllFilters()">
              <mat-icon class="!text-sm !w-4 !h-4">close</mat-icon>
              Clear all
            </button>
          }
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table mat-table [dataSource]="filteredApps()" multiTemplateDataRows class="w-full apps-table">

          <!-- Checkbox Column -->
          <ng-container matColumnDef="select">
            <th mat-header-cell *matHeaderCellDef class="!w-12 !pl-6">
              <mat-checkbox
                (change)="$event ? toggleAllRows() : null"
                [checked]="selection.hasValue() && isAllSelected()"
                [indeterminate]="selection.hasValue() && !isAllSelected()">
              </mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let row" class="!pl-6">
              <mat-checkbox
                (click)="$event.stopPropagation()"
                (change)="$event ? selection.toggle(row) : null"
                [checked]="selection.isSelected(row)">
              </mat-checkbox>
            </td>
          </ng-container>

          <!-- Validation Status Column -->
          <ng-container matColumnDef="validation">
            <th mat-header-cell *matHeaderCellDef class="!w-10"></th>
            <td mat-cell *matCellDef="let row">
              @switch (getValidationStatus(row)) {
                @case ('error') {
                  <mat-icon
                    class="!text-lg text-red-500"
                    matTooltip="Missing required fields: Unity Project or AWS Regions">
                    error
                  </mat-icon>
                }
                @case ('warning') {
                  <mat-icon
                    class="!text-lg text-amber-500"
                    matTooltip="Some metadata fields are incomplete">
                    warning
                  </mat-icon>
                }
                @case ('valid') {
                  <mat-icon
                    class="!text-lg text-green-500"
                    matTooltip="All metadata complete">
                    check_circle
                  </mat-icon>
                }
              }
            </td>
          </ng-container>

          <!-- App ID Column -->
          <ng-container matColumnDef="appId">
            <th mat-header-cell *matHeaderCellDef class="!font-semibold">App ID</th>
            <td mat-cell *matCellDef="let row">
              <span class="font-medium text-gray-900">{{ row.appId }}</span>
            </td>
          </ng-container>

          <!-- App Name Column (with compact metadata summary) -->
          <ng-container matColumnDef="appName">
            <th mat-header-cell *matHeaderCellDef class="!font-semibold">App Name</th>
            <td mat-cell *matCellDef="let row">
              <div>
                <span class="text-gray-900 font-medium">{{ row.appName }}</span>
                <div class="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                  @if (row.cloudNextMetadata?.awsRegions?.length > 0) {
                    <span>{{ row.cloudNextMetadata.awsRegions[0] }}</span>
                    @if (row.cloudNextMetadata.awsRegions.length > 1) {
                      <span class="text-gray-300">+{{ row.cloudNextMetadata.awsRegions.length - 1 }}</span>
                    }
                  } @else {
                    <span class="text-red-400">No region</span>
                  }
                  <span class="text-gray-300">·</span>
                  @if (row.cloudNextMetadata?.deployers?.length > 0) {
                    <span>{{ row.cloudNextMetadata.deployers.length }} deployer{{ row.cloudNextMetadata.deployers.length > 1 ? 's' : '' }}</span>
                  } @else {
                    <span class="text-amber-400">No deployers</span>
                  }
                  @if (row.cloudNextMetadata?.ou) {
                    <span class="text-gray-300">·</span>
                    <span>{{ row.cloudNextMetadata.ou }}</span>
                  }
                </div>
              </div>
            </td>
          </ng-container>

          <!-- Owner Column -->
          <ng-container matColumnDef="owner">
            <th mat-header-cell *matHeaderCellDef class="!font-semibold">Owner</th>
            <td mat-cell *matCellDef="let row">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                  {{ getInitials(row.owner) }}
                </div>
                <span class="text-gray-700">{{ row.owner }}</span>
              </div>
            </td>
          </ng-container>

          <!-- Unity Project Column -->
          <ng-container matColumnDef="unityProject">
            <th mat-header-cell *matHeaderCellDef class="!font-semibold">Unity Project</th>
            <td mat-cell *matCellDef="let row">
              @if (row.unityProject) {
                <span class="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-sm">
                  {{ row.unityProject }}
                </span>
              } @else {
                <span class="inline-flex items-center gap-1 text-red-600 text-sm">
                  <mat-icon class="!text-sm">error_outline</mat-icon>
                  Not set
                </span>
              }
            </td>
          </ng-container>

          <!-- AWS Regions Column -->
          <ng-container matColumnDef="awsRegions">
            <th mat-header-cell *matHeaderCellDef class="!font-semibold">AWS Regions</th>
            <td mat-cell *matCellDef="let row">
              @if (row.cloudNextMetadata?.awsRegions?.length > 0) {
                <div class="flex flex-wrap gap-1">
                  @for (region of row.cloudNextMetadata.awsRegions; track region) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-mono">
                      {{ region }}
                    </span>
                  }
                </div>
              } @else {
                <span class="text-gray-400 text-sm">—</span>
              }
            </td>
          </ng-container>

          <!-- Account Type Column -->
          <ng-container matColumnDef="accountType">
            <th mat-header-cell *matHeaderCellDef class="!font-semibold">Type</th>
            <td mat-cell *matCellDef="let row">
              @if (row.cloudNextMetadata?.isPNpAccount) {
                <span class="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-medium"
                      matTooltip="DEV-NP → PROD (no Stage)">
                  P_NP
                </span>
              } @else {
                <span class="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium"
                      matTooltip="DEV-NP → QA → PROD">
                  Standard
                </span>
              }
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef class="!font-semibold">Status</th>
            <td mat-cell *matCellDef="let row">
              <app-status-chip [status]="row.status"></app-status-chip>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="!w-24 !font-semibold">Actions</th>
            <td mat-cell *matCellDef="let row">
              <div class="flex items-center gap-1">
                <button
                  mat-icon-button
                  class="!w-8 !h-8"
                  matTooltip="View details"
                  (click)="toggleRow(row); $event.stopPropagation()">
                  <mat-icon class="!text-lg text-gray-500">{{ expandedElement === row ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <button
                  mat-icon-button
                  class="!w-8 !h-8"
                  matTooltip="Edit metadata"
                  (click)="editMetadata.emit(row); $event.stopPropagation()">
                  <mat-icon class="!text-lg text-gray-500">edit</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <!-- Expanded Detail Row -->
          <ng-container matColumnDef="expandedDetail">
            <td mat-cell *matCellDef="let row" [attr.colspan]="displayedColumns.length">
              <div class="overflow-hidden" [@detailExpand]="row === expandedElement ? 'expanded' : 'collapsed'">
                <div class="py-4 px-6 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100">
                  <app-metadata-view
                    [metadata]="row.cloudNextMetadata"
                    (edit)="editMetadata.emit(row)">
                  </app-metadata-view>
                </div>
              </div>
            </td>
          </ng-container>

          <!-- Header and Row Declarations -->
          <tr mat-header-row *matHeaderRowDef="displayedColumns" class="bg-gray-50"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: displayedColumns;"
            class="app-row cursor-pointer transition-colors"
            [class.bg-blue-50]="selection.isSelected(row)"
            [class.expanded-row]="expandedElement === row"
            (click)="selection.toggle(row)">
          </tr>
          <tr
            mat-row
            *matRowDef="let row; columns: ['expandedDetail']"
            class="detail-row">
          </tr>

          <!-- No Data Row -->
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell text-center py-12" [attr.colspan]="displayedColumns.length">
              <div class="flex flex-col items-center text-gray-500">
                <mat-icon class="!text-5xl text-gray-300 mb-3">search_off</mat-icon>
                @if (searchValue) {
                  <p class="text-lg font-medium text-gray-600">No apps found</p>
                  <p class="text-sm">No apps matching "{{ searchValue }}"</p>
                } @else {
                  <p class="text-lg font-medium text-gray-600">No apps available</p>
                  <p class="text-sm">Add apps to get started</p>
                }
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Paginator -->
      <div class="border-t border-gray-200 bg-gray-50">
        <mat-paginator
          [length]="totalCount"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 25, 50]"
          (page)="onPageChange($event)"
          showFirstLastButtons>
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .detail-row {
      height: 0;

      td {
        padding: 0 !important;
        border-bottom-width: 0;
      }
    }

    .app-row {
      &:nth-child(4n+1) {
        background-color: #fafafa;
      }

      &:hover {
        background-color: #f3f4f6 !important;
      }
    }

    .app-row.bg-blue-50 {
      background-color: #eff6ff !important;
    }

    .expanded-row {
      background-color: #e0f2fe !important;
      border-bottom: 2px solid #0ea5e9;
    }

    .expanded-row + .detail-row td {
      background-color: #f0f9ff;
      border-bottom: 2px solid #0ea5e9;
    }

    .apps-table {
      th.mat-mdc-header-cell {
        color: #374151;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding-top: 12px;
        padding-bottom: 12px;
      }

      td.mat-mdc-cell {
        padding-top: 12px;
        padding-bottom: 12px;
        border-bottom-color: #e5e7eb;
      }
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

  displayedColumns = ['select', 'validation', 'appId', 'appName', 'owner', 'unityProject', 'accountType', 'status', 'actions'];
  selection = new SelectionModel<CloudNextApp>(true, []);
  expandedElement: CloudNextApp | null = null;
  searchValue = '';

  // Filter state
  validationFilter = signal<ValidationFilter>('all');
  regionFilter = signal<RegionFilter>('all');
  projectFilter = signal<'all' | 'has' | 'missing'>('all');

  // Computed: available regions from apps
  availableRegions = computed(() => {
    const regions = new Set<string>();
    this.apps.forEach(app => {
      app.cloudNextMetadata?.awsRegions?.forEach(region => {
        regions.add(region);
      });
    });
    return Array.from(regions).sort();
  });

  // Computed: filtered apps based on all active filters
  filteredApps = computed(() => {
    let result = [...this.apps];

    // Validation filter
    if (this.validationFilter() !== 'all') {
      result = result.filter(app => this.getValidationStatus(app) === this.validationFilter());
    }

    // Region filter
    const region = this.regionFilter();
    if (region !== 'all') {
      if (region === 'none') {
        result = result.filter(app => !app.cloudNextMetadata?.awsRegions?.length);
      } else {
        result = result.filter(app => app.cloudNextMetadata?.awsRegions?.includes(region));
      }
    }

    // Unity Project filter
    if (this.projectFilter() !== 'all') {
      if (this.projectFilter() === 'has') {
        result = result.filter(app => app.unityProject);
      } else {
        result = result.filter(app => !app.unityProject);
      }
    }

    return result;
  });

  // Check if any filter is active
  hasActiveFilters(): boolean {
    return this.validationFilter() !== 'all' ||
           this.regionFilter() !== 'all' ||
           this.projectFilter() !== 'all';
  }

  // Filter setters
  setValidationFilter(filter: ValidationFilter): void {
    this.validationFilter.set(filter);
  }

  setRegionFilter(filter: RegionFilter): void {
    this.regionFilter.set(filter);
  }

  setProjectFilter(filter: 'all' | 'has' | 'missing'): void {
    this.projectFilter.set(filter);
  }

  clearAllFilters(): void {
    this.validationFilter.set('all');
    this.regionFilter.set('all');
    this.projectFilter.set('all');
  }

  // Filter labels
  getValidationFilterLabel(): string {
    switch (this.validationFilter()) {
      case 'valid': return 'Complete';
      case 'warning': return 'Incomplete';
      case 'error': return 'Missing Required';
      default: return 'Validation';
    }
  }

  getRegionFilterLabel(): string {
    const filter = this.regionFilter();
    if (filter === 'all') return 'Region';
    if (filter === 'none') return 'No Region';
    return filter;
  }

  getProjectFilterLabel(): string {
    switch (this.projectFilter()) {
      case 'has': return 'Has Project';
      case 'missing': return 'No Project';
      default: return 'Unity Project';
    }
  }

  constructor() {
    this.selection.changed.subscribe(() => {
      this.selectionChange.emit(this.selection.selected);
    });
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.filteredApps().length;
    return numSelected === numRows && numRows > 0;
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.filteredApps());
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

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getValidationStatus(app: CloudNextApp): 'valid' | 'warning' | 'error' {
    const metadata = app.cloudNextMetadata;

    // Required fields check
    if (!app.unityProject || !metadata?.awsRegions?.length) {
      return 'error';
    }

    // Optional but recommended fields
    const hasAccounts = metadata?.awsAccounts?.devNp || metadata?.awsAccounts?.qa || metadata?.awsAccounts?.prod;
    const hasDeployers = metadata?.deployers && metadata.deployers.length > 0;

    if (!hasAccounts || !hasDeployers) {
      return 'warning';
    }

    return 'valid';
  }

  getAccountsStatus(app: CloudNextApp): string {
    const accounts = app.cloudNextMetadata?.awsAccounts;
    if (!accounts) return 'No accounts';

    const isPNp = app.cloudNextMetadata?.isPNpAccount;
    const parts: string[] = [];

    if (accounts.devNp) parts.push('Dev');
    if (!isPNp && accounts.qa) parts.push('QA');
    if (accounts.prod) parts.push('Prod');

    if (parts.length === 0) return 'No accounts';

    const expected = isPNp ? 2 : 3;
    return `${parts.length}/${expected} accounts`;
  }
}
