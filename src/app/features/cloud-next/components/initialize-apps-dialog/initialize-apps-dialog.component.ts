import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap, takeUntil, catchError, of } from 'rxjs';
import { CloudNextService } from '../../services/cloud-next.service';
import {
  AppSearchResult,
  CloudNextApp,
  InitAppRow,
  InitRowValidationState,
  InitCloudNextRequest,
  CloudNextAppRequest
} from '../../models/cloud-next-app.model';

export interface InitializeAppsDialogData {
  selectedApps?: CloudNextApp[];
}

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1'
];

const CIDR_SIZES = [16, 20, 24, 28];
const AZ_OPTIONS = [1, 2, 3, 4, 5, 6];

@Component({
  selector: 'app-initialize-apps-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatSelectModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MonacoEditorModule
  ],
  template: `
    <!-- Dialog Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Initialize Apps for Cloud Next</h2>
        <p class="text-sm text-gray-500 mt-0.5">Add apps and complete metadata to initialize for Cloud Next</p>
      </div>
      <div class="flex items-center gap-4">
        <!-- View Mode Toggle -->
        <mat-button-toggle-group
          [value]="viewMode()"
          (change)="onViewModeChange($event.value)"
          class="view-toggle">
          <mat-button-toggle value="form">
            <mat-icon class="!text-lg mr-1">table_chart</mat-icon>
            Form
          </mat-button-toggle>
          <mat-button-toggle value="json">
            <mat-icon class="!text-lg mr-1">code</mat-icon>
            JSON
          </mat-button-toggle>
        </mat-button-toggle-group>
        <button mat-icon-button mat-dialog-close class="!text-gray-400 hover:!text-gray-600">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>

    @if (viewMode() === 'form') {
      <!-- FORM VIEW -->
      <!-- Add Apps Section -->
      <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div class="flex items-center gap-4">
          <!-- Search Input -->
          <div class="flex-1 relative">
            <mat-form-field appearance="outline" class="w-full !text-sm dense-field">
              <mat-icon matPrefix class="!text-gray-400">search</mat-icon>
              <input
                matInput
                placeholder="Search by App ID or App Name..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)">
              @if (isSearching()) {
                <mat-spinner matSuffix diameter="18"></mat-spinner>
              }
              @if (searchQuery && !isSearching()) {
                <button matSuffix mat-icon-button (click)="clearSearch()">
                  <mat-icon class="!text-lg">close</mat-icon>
                </button>
              }
            </mat-form-field>

            <!-- Search Results Dropdown -->
            @if (searchResults().length > 0) {
              <div class="absolute top-full left-0 right-0 z-20 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                @for (app of searchResults(); track app.appId) {
                  <div
                    class="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                    [class.bg-green-50]="isAppInGrid(app.appId)"
                    (click)="addAppFromSearch(app)">
                    <div>
                      <span class="text-sm font-medium text-gray-900">{{ app.appId }}</span>
                      <span class="text-sm text-gray-500 ml-2">{{ app.appName }}</span>
                    </div>
                    @if (isAppInGrid(app.appId)) {
                      <mat-icon class="!text-green-600 !text-lg">check</mat-icon>
                    } @else {
                      <mat-icon class="!text-blue-600 !text-lg">add</mat-icon>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <span class="text-gray-400 text-sm">OR</span>

          <!-- Paste Input -->
          <div class="flex items-center gap-2">
            <input
              type="text"
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              placeholder="Paste App IDs..."
              [(ngModel)]="pasteInput"
              (keydown.enter)="addFromPaste()">
            <button
              mat-raised-button
              color="primary"
              [disabled]="!pasteInput.trim()"
              (click)="addFromPaste()">
              Add
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-2">Search for apps or paste comma/tab/newline separated App IDs</p>
      </div>

      <!-- Toolbar -->
      <div class="px-6 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600">
            <span class="font-semibold text-gray-900">{{ rows().length }}</span> apps
          </span>
          <div class="h-4 w-px bg-gray-300"></div>
          @if (validationSummary().errors > 0) {
            <span class="text-sm text-red-600 flex items-center gap-1">
              <mat-icon class="!text-base">error</mat-icon>
              {{ validationSummary().errors }} missing required fields
            </span>
          } @else if (validationSummary().warnings > 0) {
            <span class="text-sm text-amber-600 flex items-center gap-1">
              <mat-icon class="!text-base">warning</mat-icon>
              {{ validationSummary().warnings }} apps with warnings
            </span>
          } @else if (rows().length > 0) {
            <span class="text-sm text-green-600 flex items-center gap-1">
              <mat-icon class="!text-base">check_circle</mat-icon>
              All apps ready
            </span>
          }
        </div>
        <div class="flex items-center gap-2">
          @if (rows().length > 1) {
            <button
              mat-button
              class="!text-sm"
              [disabled]="rows().length < 2"
              (click)="copyFromFirstRow()">
              <mat-icon class="!text-base mr-1">content_copy</mat-icon>
              Copy from first row
            </button>
          }
        </div>
      </div>

      <!-- Spreadsheet Grid -->
      <div class="flex-1 overflow-auto p-4" style="max-height: 50vh;">
        @if (rows().length === 0) {
          <div class="flex flex-col items-center justify-center py-16 text-gray-500">
            <mat-icon class="!text-6xl !text-gray-300 mb-4">table_chart</mat-icon>
            <p class="text-lg font-medium text-gray-600">No apps added yet</p>
            <p class="text-sm">Search or paste App IDs above to add apps for initialization</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full border-collapse min-w-[1600px]">
              <thead>
                <tr class="bg-gray-100">
                  <th class="sticky left-0 bg-gray-100 z-10 px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b border-r border-gray-200 min-w-[120px]">
                    App ID
                  </th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[150px]">
                    Unity Project <span class="text-red-500">*</span>
                  </th>
                  <th class="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[70px]">
                    Shared
                  </th>
                  <th class="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[70px]">
                    PNp
                  </th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[180px]">
                    AWS Regions <span class="text-red-500">*</span>
                  </th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[130px]">
                    DEV/NP Acct
                  </th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[130px]">
                    QA Acct
                  </th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[130px]">
                    PROD Acct
                  </th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[90px]">
                    CIDR
                  </th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[70px]">
                    AZs
                  </th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[100px]">
                    OU
                  </th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[140px]">
                    Deployers
                  </th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 min-w-[140px]">
                    Contributors
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (row of rows(); track row.appId; let i = $index) {
                  <tr
                    class="hover:bg-gray-50"
                    [class.bg-red-50]="row.validationState === 'error'"
                    [class.bg-amber-50]="row.validationState === 'warning'">
                    <!-- App ID (Sticky) -->
                    <td
                      class="sticky left-0 z-10 px-3 py-2 border-r border-gray-200"
                      [class.bg-red-50]="row.validationState === 'error'"
                      [class.bg-amber-50]="row.validationState === 'warning'"
                      [class.bg-white]="row.validationState === 'valid'">
                      <div class="flex items-center gap-2">
                        @if (row.validationState === 'error') {
                          <mat-icon class="!text-red-500 !text-base" matTooltip="Missing required fields">error</mat-icon>
                        } @else if (row.validationState === 'warning') {
                          <mat-icon class="!text-amber-500 !text-base" matTooltip="Some fields incomplete">warning</mat-icon>
                        } @else {
                          <mat-icon class="!text-green-500 !text-base" matTooltip="Ready">check_circle</mat-icon>
                        }
                        <span class="text-sm font-medium text-gray-900">{{ row.appId }}</span>
                        <button
                          mat-icon-button
                          class="!w-6 !h-6 !text-gray-400 hover:!text-red-500"
                          matTooltip="Remove"
                          (click)="removeRow(i)">
                          <mat-icon class="!text-base">close</mat-icon>
                        </button>
                      </div>
                      @if (row.appName && row.appName !== row.appId) {
                        <div class="text-xs text-gray-500 mt-0.5 pl-6">{{ row.appName }}</div>
                      }
                    </td>

                    <!-- Unity Project -->
                    <td class="px-2 py-1.5">
                      <input
                        type="text"
                        class="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        [class.border-red-300]="!row.unityProject"
                        [class.bg-red-50]="!row.unityProject"
                        [class.border-gray-300]="row.unityProject"
                        placeholder="Required"
                        [(ngModel)]="row.unityProject"
                        (ngModelChange)="validateRow(i)">
                    </td>

                    <!-- Shared Account -->
                    <td class="px-2 py-1.5 text-center">
                      <mat-checkbox
                        [(ngModel)]="row.isSharedAccount"
                        (change)="validateRow(i)">
                      </mat-checkbox>
                    </td>

                    <!-- PNp -->
                    <td class="px-2 py-1.5 text-center">
                      <mat-checkbox
                        [(ngModel)]="row.isPNpAccount"
                        (change)="validateRow(i)">
                      </mat-checkbox>
                    </td>

                    <!-- AWS Regions -->
                    <td class="px-2 py-1.5">
                      <mat-select
                        multiple
                        class="w-full text-sm"
                        [class.border-red-300]="row.awsRegions.length === 0"
                        placeholder="Select regions"
                        [(ngModel)]="row.awsRegions"
                        (selectionChange)="validateRow(i)">
                        @for (region of awsRegions; track region) {
                          <mat-option [value]="region">{{ region }}</mat-option>
                        }
                      </mat-select>
                    </td>

                    <!-- DEV/NP Account -->
                    <td class="px-2 py-1.5">
                      <input
                        type="text"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Account ID"
                        [(ngModel)]="row.devNpAccount">
                    </td>

                    <!-- QA Account -->
                    <td class="px-2 py-1.5">
                      <input
                        type="text"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Account ID"
                        [(ngModel)]="row.qaAccount">
                    </td>

                    <!-- PROD Account -->
                    <td class="px-2 py-1.5">
                      <input
                        type="text"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Account ID"
                        [(ngModel)]="row.prodAccount">
                    </td>

                    <!-- CIDR Size -->
                    <td class="px-2 py-1.5">
                      <select
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        [(ngModel)]="row.cidrSize">
                        <option [ngValue]="null">Select</option>
                        @for (size of cidrSizes; track size) {
                          <option [ngValue]="size">/{{ size }}</option>
                        }
                      </select>
                    </td>

                    <!-- Number of AZs -->
                    <td class="px-2 py-1.5">
                      <select
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        [(ngModel)]="row.numberOfAzs">
                        <option [ngValue]="null">-</option>
                        @for (az of azOptions; track az) {
                          <option [ngValue]="az">{{ az }}</option>
                        }
                      </select>
                    </td>

                    <!-- OU -->
                    <td class="px-2 py-1.5">
                      <input
                        type="text"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="OU"
                        [(ngModel)]="row.ou">
                    </td>

                    <!-- Deployers -->
                    <td class="px-2 py-1.5">
                      <input
                        type="text"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="user1, user2"
                        [(ngModel)]="row.deployers">
                    </td>

                    <!-- Contributors -->
                    <td class="px-2 py-1.5">
                      <input
                        type="text"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="user1, user2"
                        [(ngModel)]="row.contributors">
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    } @else {
      <!-- JSON VIEW -->
      <div class="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600">
            Edit JSON directly or paste from external source
          </span>
          @if (jsonError()) {
            <span class="text-sm text-red-600 flex items-center gap-1">
              <mat-icon class="!text-base">error</mat-icon>
              {{ jsonError() }}
            </span>
          } @else if (jsonContent) {
            <span class="text-sm text-green-600 flex items-center gap-1">
              <mat-icon class="!text-base">check_circle</mat-icon>
              Valid JSON
            </span>
          }
        </div>
        <div class="flex items-center gap-2">
          <button mat-button class="!text-sm" (click)="formatJson()">
            <mat-icon class="!text-base mr-1">auto_fix_high</mat-icon>
            Format
          </button>
          <button mat-button class="!text-sm" (click)="copyJson()">
            <mat-icon class="!text-base mr-1">content_copy</mat-icon>
            Copy
          </button>
          <button mat-button class="!text-sm" (click)="loadSampleJson()">
            <mat-icon class="!text-base mr-1">description</mat-icon>
            Load Sample
          </button>
        </div>
      </div>

      <!-- Monaco Editor -->
      <div class="flex-1 p-4 editor-wrapper">
        <ngx-monaco-editor
          class="editor-instance"
          [options]="editorOptions"
          [(ngModel)]="jsonContent"
          (ngModelChange)="onJsonChange($event)">
        </ngx-monaco-editor>
      </div>
    }

    <!-- Dialog Footer -->
    <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div class="text-sm text-gray-500">
        @if (viewMode() === 'form' && rows().length > 0) {
          <span class="text-green-600 font-medium">{{ validationSummary().valid }}</span> ready
          @if (validationSummary().warnings > 0) {
            · <span class="text-amber-600 font-medium">{{ validationSummary().warnings }}</span> warnings
          }
          @if (validationSummary().errors > 0) {
            · <span class="text-red-600 font-medium">{{ validationSummary().errors }}</span> errors
          }
        } @else if (viewMode() === 'json') {
          @if (jsonAppsCount() > 0) {
            <span class="text-blue-600 font-medium">{{ jsonAppsCount() }}</span> apps in JSON
          }
        }
      </div>
      <div class="flex gap-3">
        <button mat-button mat-dialog-close>Cancel</button>
        <button
          mat-raised-button
          color="primary"
          [disabled]="!canSubmit() || isSubmitting()"
          (click)="submit()">
          @if (isSubmitting()) {
            <mat-spinner diameter="18" class="mr-2"></mat-spinner>
          } @else {
            <mat-icon class="mr-1">rocket_launch</mat-icon>
          }
          Initialize Apps
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      width: 95vw;
      max-width: 1800px;
    }

    .dense-field {
      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
      ::ng-deep .mat-mdc-text-field-wrapper {
        padding: 0 12px;
      }
      ::ng-deep .mat-mdc-form-field-infix {
        padding-top: 8px;
        padding-bottom: 8px;
        min-height: 40px;
      }
    }

    mat-select {
      ::ng-deep .mat-mdc-select-trigger {
        padding: 6px 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
      }
    }

    table input, table select {
      min-height: 32px;
    }

    .view-toggle {
      ::ng-deep .mat-button-toggle-appearance-standard {
        background: transparent;
      }
      ::ng-deep .mat-button-toggle-checked {
        background: #e0e7ff;
        color: #4f46e5;
      }
    }

    .editor-wrapper {
      height: 50vh;
      min-height: 400px;
      display: flex;
      flex-direction: column;
    }

    .editor-instance {
      flex: 1;
      min-height: 380px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      overflow: hidden;
    }

    ::ng-deep .editor-instance .editor-container {
      height: 100% !important;
      min-height: 380px !important;
    }

    ::ng-deep .editor-instance .monaco-editor {
      height: 100% !important;
      min-height: 380px !important;
    }

    ::ng-deep .editor-instance .overflow-guard {
      height: 100% !important;
      min-height: 380px !important;
    }
  `]
})
export class InitializeAppsDialogComponent implements OnInit, OnDestroy {
  private dialogRef = inject(MatDialogRef<InitializeAppsDialogComponent>);
  private cloudNextService = inject(CloudNextService);
  private data = inject<InitializeAppsDialogData>(MAT_DIALOG_DATA, { optional: true });
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Constants
  awsRegions = AWS_REGIONS;
  cidrSizes = CIDR_SIZES;
  azOptions = AZ_OPTIONS;

  // Form state
  searchQuery = '';
  pasteInput = '';
  jsonContent = '';

  // Monaco Editor options
  editorOptions = {
    theme: 'vs',
    language: 'json',
    minimap: { enabled: false },
    automaticLayout: true,
    fontSize: 14,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    tabSize: 2
  };

  // Signals
  viewMode = signal<'form' | 'json'>('form');
  rows = signal<InitAppRow[]>([]);
  searchResults = signal<AppSearchResult[]>([]);
  isSearching = signal(false);
  isSubmitting = signal(false);
  jsonError = signal<string | null>(null);
  jsonAppsCount = signal(0);

  // Computed
  validationSummary = computed(() => {
    const allRows = this.rows();
    return {
      valid: allRows.filter(r => r.validationState === 'valid').length,
      warnings: allRows.filter(r => r.validationState === 'warning').length,
      errors: allRows.filter(r => r.validationState === 'error').length
    };
  });

  canSubmit = computed(() => {
    if (this.viewMode() === 'form') {
      const allRows = this.rows();
      return allRows.length > 0 && this.validationSummary().errors === 0;
    } else {
      return this.jsonAppsCount() > 0 && !this.jsonError();
    }
  });

  ngOnInit(): void {
    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(query => query.length >= 2),
      switchMap(query => {
        this.isSearching.set(true);
        return this.cloudNextService.searchApps(query).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(results => {
      this.searchResults.set(results);
      this.isSearching.set(false);
    });

    // Pre-load selected apps from dialog data
    if (this.data?.selectedApps?.length) {
      this.loadSelectedApps(this.data.selectedApps);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // View mode switching
  onViewModeChange(mode: 'form' | 'json'): void {
    if (mode === 'json' && this.viewMode() === 'form') {
      // Switching to JSON: convert form data to JSON
      this.syncFormToJson();
    } else if (mode === 'form' && this.viewMode() === 'json') {
      // Switching to Form: convert JSON to form data
      this.syncJsonToForm();
    }
    this.viewMode.set(mode);
  }

  private syncFormToJson(): void {
    const request = this.buildRequest();
    this.jsonContent = JSON.stringify(request, null, 2);
    this.jsonError.set(null);
    this.jsonAppsCount.set(request.apps.length);
  }

  private syncJsonToForm(): void {
    try {
      const parsed = JSON.parse(this.jsonContent) as InitCloudNextRequest;
      if (!parsed.apps || !Array.isArray(parsed.apps)) {
        this.jsonError.set('Invalid format: missing "apps" array');
        return;
      }

      const newRows = parsed.apps.map(app => this.requestToRow(app));
      this.rows.set(newRows);
      this.jsonError.set(null);
    } catch (e) {
      this.jsonError.set('Invalid JSON syntax');
    }
  }

  onJsonChange(content: string): void {
    this.jsonContent = content;
    try {
      const parsed = JSON.parse(content) as InitCloudNextRequest;
      if (!parsed.apps || !Array.isArray(parsed.apps)) {
        this.jsonError.set('Invalid format: missing "apps" array');
        this.jsonAppsCount.set(0);
        return;
      }
      this.jsonError.set(null);
      this.jsonAppsCount.set(parsed.apps.length);
    } catch (e) {
      this.jsonError.set('Invalid JSON syntax');
      this.jsonAppsCount.set(0);
    }
  }

  formatJson(): void {
    try {
      const parsed = JSON.parse(this.jsonContent);
      this.jsonContent = JSON.stringify(parsed, null, 2);
    } catch (e) {
      // Keep as-is if invalid
    }
  }

  copyJson(): void {
    navigator.clipboard.writeText(this.jsonContent);
  }

  loadSampleJson(): void {
    const sample: InitCloudNextRequest = {
      apps: [
        {
          appId: 'APP001',
          isCloudNextEligible: true,
          cloudNextMetadata: {
            unityProject: 'proj-sample',
            isSharedAccount: false,
            isPNpAccount: true,
            awsRegions: ['us-east-1', 'us-west-2'],
            awsAccountNames: {
              'DEV/NP': '123456789012',
              'QA': '234567890123',
              'PROD': '345678901234'
            },
            cidrSize: 24,
            numberOfAzs: 2,
            ou: 'Platform',
            deployers: ['user1', 'user2'],
            contributors: ['user3']
          }
        }
      ]
    };
    this.jsonContent = JSON.stringify(sample, null, 2);
    this.onJsonChange(this.jsonContent);
  }

  private requestToRow(app: CloudNextAppRequest): InitAppRow {
    const m = app.cloudNextMetadata;
    const row: InitAppRow = {
      appId: app.appId,
      appName: app.appId,
      unityProject: m.unityProject || '',
      isSharedAccount: m.isSharedAccount ?? false,
      isPNpAccount: m.isPNpAccount ?? false,
      awsRegions: m.awsRegions || [],
      devNpAccount: m.awsAccountNames?.['DEV/NP'] || '',
      qaAccount: m.awsAccountNames?.['QA'] || '',
      prodAccount: m.awsAccountNames?.['PROD'] || '',
      cidrSize: m.cidrSize ?? null,
      numberOfAzs: m.numberOfAzs ?? null,
      ou: m.ou || '',
      deployers: m.deployers?.join(', ') || '',
      contributors: m.contributors?.join(', ') || '',
      validationState: 'error',
      isExisting: false
    };
    row.validationState = this.getValidationState(row);
    return row;
  }

  private loadSelectedApps(apps: CloudNextApp[]): void {
    const newRows = apps
      .filter(app => app.status === 'new')
      .map(app => this.createRowFromApp(app));
    this.rows.set(newRows);
  }

  private createRowFromApp(app: CloudNextApp): InitAppRow {
    const metadata = app.cloudNextMetadata;
    const row: InitAppRow = {
      appId: app.appId,
      appName: app.appName,
      owner: app.owner,
      unityProject: metadata?.unityProjectName ?? '',
      isSharedAccount: metadata?.isSharedAccount ?? false,
      isPNpAccount: metadata?.environmentType === 'NP',
      awsRegions: metadata?.awsRegion ? [metadata.awsRegion] : [],
      devNpAccount: metadata?.awsAccounts?.devNp ?? '',
      qaAccount: metadata?.awsAccounts?.qa ?? '',
      prodAccount: metadata?.awsAccounts?.prod ?? '',
      cidrSize: metadata?.ciorSize ? parseInt(metadata.ciorSize, 10) : null,
      numberOfAzs: null,
      ou: metadata?.ou ?? '',
      deployers: metadata?.deployers?.join(', ') ?? '',
      contributors: metadata?.contributors?.join(', ') ?? '',
      validationState: 'error',
      isExisting: true
    };
    row.validationState = this.getValidationState(row);
    return row;
  }

  private createEmptyRow(appId: string, appName?: string, owner?: string): InitAppRow {
    const row: InitAppRow = {
      appId,
      appName: appName ?? appId,
      owner,
      unityProject: '',
      isSharedAccount: false,
      isPNpAccount: false,
      awsRegions: [],
      devNpAccount: '',
      qaAccount: '',
      prodAccount: '',
      cidrSize: null,
      numberOfAzs: null,
      ou: '',
      deployers: '',
      contributors: '',
      validationState: 'error',
      isExisting: false
    };
    row.validationState = this.getValidationState(row);
    return row;
  }

  private getValidationState(row: InitAppRow): InitRowValidationState {
    // Required fields
    if (!row.unityProject || row.awsRegions.length === 0) {
      return 'error';
    }
    // Warning if optional but recommended fields are missing
    if (!row.devNpAccount && !row.qaAccount && !row.prodAccount) {
      return 'warning';
    }
    return 'valid';
  }

  // Search methods
  onSearchChange(query: string): void {
    if (query.length < 2) {
      this.searchResults.set([]);
      return;
    }
    this.searchSubject.next(query);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults.set([]);
  }

  isAppInGrid(appId: string): boolean {
    return this.rows().some(r => r.appId === appId);
  }

  addAppFromSearch(app: AppSearchResult): void {
    if (this.isAppInGrid(app.appId)) {
      return;
    }

    // Check if app exists in the system to get existing metadata
    this.cloudNextService.getAppById(app.appId).pipe(
      takeUntil(this.destroy$)
    ).subscribe(existingApp => {
      const newRow = existingApp
        ? this.createRowFromApp(existingApp)
        : this.createEmptyRow(app.appId, app.appName, app.owner);

      this.rows.update(rows => [...rows, newRow]);
    });

    this.clearSearch();
  }

  addFromPaste(): void {
    const input = this.pasteInput.trim();
    if (!input) return;

    const ids = input
      .split(/[,\t\n]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0 && !this.isAppInGrid(id));

    if (ids.length === 0) {
      this.pasteInput = '';
      return;
    }

    // Fetch existing app data for these IDs
    this.cloudNextService.getAppsByIds(ids).pipe(
      takeUntil(this.destroy$)
    ).subscribe(existingApps => {
      const existingMap = new Map(existingApps.map(a => [a.appId, a]));

      const newRows = ids.map(appId => {
        const existing = existingMap.get(appId);
        return existing
          ? this.createRowFromApp(existing)
          : this.createEmptyRow(appId);
      });

      this.rows.update(rows => [...rows, ...newRows]);
    });

    this.pasteInput = '';
  }

  // Row management
  removeRow(index: number): void {
    this.rows.update(rows => rows.filter((_, i) => i !== index));
  }

  validateRow(index: number): void {
    this.rows.update(rows => {
      const updated = [...rows];
      updated[index] = {
        ...updated[index],
        validationState: this.getValidationState(updated[index])
      };
      return updated;
    });
  }

  copyFromFirstRow(): void {
    const allRows = this.rows();
    if (allRows.length < 2) return;

    const first = allRows[0];
    this.rows.update(rows => rows.map((row, i) => {
      if (i === 0) return row;
      return {
        ...row,
        isSharedAccount: first.isSharedAccount,
        isPNpAccount: first.isPNpAccount,
        awsRegions: [...first.awsRegions],
        devNpAccount: first.devNpAccount,
        qaAccount: first.qaAccount,
        prodAccount: first.prodAccount,
        cidrSize: first.cidrSize,
        numberOfAzs: first.numberOfAzs,
        ou: first.ou,
        validationState: this.getValidationState({
          ...row,
          awsRegions: first.awsRegions
        })
      };
    }));
  }

  // Submit
  submit(): void {
    if (!this.canSubmit()) return;

    this.isSubmitting.set(true);

    let request: InitCloudNextRequest;

    if (this.viewMode() === 'form') {
      request = this.buildRequest();
    } else {
      try {
        request = JSON.parse(this.jsonContent);
      } catch (e) {
        this.isSubmitting.set(false);
        return;
      }
    }

    this.cloudNextService.initializeApps(request).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.dialogRef.close({
          success: true,
          initialized: response.initialized,
          failed: response.failed
        });
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  private buildRequest(): InitCloudNextRequest {
    return {
      apps: this.rows().map(row => this.rowToRequest(row))
    };
  }

  private rowToRequest(row: InitAppRow): CloudNextAppRequest {
    return {
      appId: row.appId,
      isCloudNextEligible: true,
      cloudNextMetadata: {
        unityProject: row.unityProject,
        isSharedAccount: row.isSharedAccount,
        isPNpAccount: row.isPNpAccount,
        awsRegions: row.awsRegions,
        awsAccountNames: {
          'DEV/NP': row.devNpAccount || undefined,
          'QA': row.qaAccount || undefined,
          'PROD': row.prodAccount || undefined
        },
        cidrSize: row.cidrSize ?? undefined,
        numberOfAzs: row.numberOfAzs ?? undefined,
        ou: row.ou || undefined,
        deployers: row.deployers ? row.deployers.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        contributors: row.contributors ? row.contributors.split(',').map(s => s.trim()).filter(Boolean) : undefined
      }
    };
  }
}
