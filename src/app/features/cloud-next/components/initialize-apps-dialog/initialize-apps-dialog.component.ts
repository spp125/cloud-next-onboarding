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
import { ClipboardModule, Clipboard } from '@angular/cdk/clipboard';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap, takeUntil, catchError, of } from 'rxjs';
import { CloudNextService } from '../../services/cloud-next.service';
import {
  AppSearchResult,
  CloudNextApp,
  InitAppRow,
  InitRowValidationState,
  InitCloudNextRequest,
  CloudNextAppRequest,
  MigrationSourceServers
} from '../../models/cloud-next-app.model';

export interface InitializeAppsDialogData {
  selectedApps?: CloudNextApp[];
}

const AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1'
];
const CIDR_SIZES = [16, 20, 24, 28];
const AZ_OPTIONS = [1, 2, 3, 4, 5, 6];

const EMPTY_MIGRATION = (): MigrationSourceServers => ({
  dev:   { noServers: null, servers: [] },
  stage: { noServers: null, servers: [] },
  prod:  { noServers: null, servers: [] }
});

@Component({
  selector: 'app-initialize-apps-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatProgressSpinnerModule, MatCheckboxModule,
    MatSelectModule, MatTooltipModule, MatButtonToggleModule, ClipboardModule, MonacoEditorModule
  ],
  template: `
    <!-- ── Dialog Header ── -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
      <div>
        <h2 class="text-base font-semibold text-gray-900">Initialize Apps for Cloud Next</h2>
        <p class="text-xs text-gray-500 mt-0.5">Add apps and complete metadata to initialize</p>
      </div>
      <div class="flex items-center gap-3">
        <mat-button-toggle-group [value]="viewMode()" (change)="onViewModeChange($event.value)" class="view-toggle">
          <mat-button-toggle value="form"><mat-icon class="!text-base mr-1">view_agenda</mat-icon>Form</mat-button-toggle>
          <mat-button-toggle value="json"><mat-icon class="!text-base mr-1">code</mat-icon>JSON</mat-button-toggle>
        </mat-button-toggle-group>
        <button mat-icon-button mat-dialog-close class="!text-gray-400 hover:!text-gray-600">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>

    @if (viewMode() === 'form') {
      <!-- ── Add Apps Bar ── -->
      <div class="px-6 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="flex-1 relative">
            <mat-form-field appearance="outline" class="w-full !text-sm dense-field">
              <mat-icon matPrefix class="!text-gray-400 !text-lg">search</mat-icon>
              <input matInput placeholder="Search by App ID or Name…" [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange($event)">
              @if (isSearching()) { <mat-spinner matSuffix diameter="16"></mat-spinner> }
              @if (searchQuery && !isSearching()) {
                <button matSuffix mat-icon-button (click)="clearSearch()"><mat-icon class="!text-base">close</mat-icon></button>
              }
            </mat-form-field>
            @if (searchResults().length > 0) {
              <div class="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-44 overflow-y-auto">
                @for (app of searchResults(); track app.appId) {
                  <div class="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                       [class.bg-green-50]="isAppInGrid(app.appId)"
                       (click)="addAppFromSearch(app)">
                    <div>
                      <span class="text-sm font-medium text-gray-900">{{ app.appId }}</span>
                      <span class="text-sm text-gray-500 ml-2">{{ app.appName }}</span>
                    </div>
                    <mat-icon class="!text-base" [class.!text-green-600]="isAppInGrid(app.appId)" [class.!text-blue-500]="!isAppInGrid(app.appId)">
                      {{ isAppInGrid(app.appId) ? 'check' : 'add' }}
                    </mat-icon>
                  </div>
                }
              </div>
            }
          </div>
          <span class="text-gray-400 text-xs">or</span>
          <input type="text"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            placeholder="Paste App IDs…"
            [(ngModel)]="pasteInput"
            (keydown.enter)="addFromPaste()">
          <button mat-raised-button color="primary" [disabled]="!pasteInput.trim()" (click)="addFromPaste()" class="!text-sm">Add</button>
        </div>
      </div>

      <!-- ── Toolbar ── -->
      <div class="px-6 py-2 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3 text-xs text-gray-500">
          <span><span class="font-semibold text-gray-800">{{ rows().length }}</span> apps</span>
          @if (rows().length > 0) {
            <span class="text-gray-300">|</span>
            @if (validationSummary().errors > 0) {
              <span class="text-red-500 flex items-center gap-1"><mat-icon class="!text-sm">error</mat-icon>{{ validationSummary().errors }} with errors</span>
            } @else if (validationSummary().warnings > 0) {
              <span class="text-amber-500 flex items-center gap-1"><mat-icon class="!text-sm">warning</mat-icon>{{ validationSummary().warnings }} with warnings</span>
            } @else {
              <span class="text-green-600 flex items-center gap-1"><mat-icon class="!text-sm">check_circle</mat-icon>All apps ready</span>
            }
          }
        </div>
        @if (rows().length > 1) {
          <button mat-button class="!text-xs !text-gray-500" (click)="copyFromFirstRow()">
            <mat-icon class="!text-sm mr-1">content_copy</mat-icon>Copy config from first app
          </button>
        }
      </div>

      <!-- ── Two-panel body ── -->
      <div class="flex flex-1 overflow-hidden">

        <!-- LEFT: App list -->
        <div class="w-48 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
          @if (rows().length === 0) {
            <div class="flex flex-col items-center justify-center h-full text-gray-400 px-4 text-center">
              <mat-icon class="!text-4xl !text-gray-200 mb-2">inbox</mat-icon>
              <p class="text-xs">No apps yet. Search or paste IDs above.</p>
            </div>
          } @else {
            <div class="p-2">
              <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 mb-1 mt-1">Apps ({{ rows().length }})</p>
              @for (row of rows(); track row.appId; let i = $index) {
                <div class="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors"
                     [class.bg-blue-50]="selectedRowIndex() === i"
                     [class.hover:bg-gray-50]="selectedRowIndex() !== i"
                     (click)="selectRow(i)">
                  @if (row.validationState === 'error') {
                    <mat-icon class="!text-red-500 !text-sm flex-shrink-0">error</mat-icon>
                  } @else if (row.validationState === 'warning') {
                    <mat-icon class="!text-amber-500 !text-sm flex-shrink-0">warning</mat-icon>
                  } @else {
                    <mat-icon class="!text-green-500 !text-sm flex-shrink-0">check_circle</mat-icon>
                  }
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-semibold text-gray-900 truncate">{{ row.appId }}</p>
                    @if (row.appName && row.appName !== row.appId) {
                      <p class="text-[10px] text-gray-500 truncate">{{ row.appName }}</p>
                    }
                  </div>
                  <button class="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-400 hover:bg-red-50 flex-shrink-0"
                          (click)="removeRow(i); $event.stopPropagation()">
                    <mat-icon class="!text-xs">close</mat-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- RIGHT: Sections for selected app -->
        <div class="flex-1 overflow-y-auto bg-gray-50">
          @if (rows().length === 0) {
            <div class="flex flex-col items-center justify-center h-full text-gray-400">
              <mat-icon class="!text-6xl !text-gray-200 mb-3">layers</mat-icon>
              <p class="text-sm font-medium text-gray-500">No apps added yet</p>
              <p class="text-xs text-gray-400">Search or paste App IDs above to get started</p>
            </div>
          } @else if (selectedRow(); as row) {
            <div class="p-4 flex flex-col gap-3">

              <!-- App context bar -->
              <div class="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg flex-shrink-0">
                <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{{ row.appId }}</span>
                <span class="text-sm font-semibold text-gray-800">{{ row.appName !== row.appId ? row.appName : '' }}</span>
                @if (row.owner) { <span class="text-xs text-gray-400">· {{ row.owner }}</span> }
                <div class="ml-auto flex items-center gap-2">
                  @if (row.validationState === 'error') {
                    <span class="text-xs text-red-600 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full">
                      <mat-icon class="!text-xs">error</mat-icon> Fields required
                    </span>
                  } @else if (row.validationState === 'warning') {
                    <span class="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                      <mat-icon class="!text-xs">warning</mat-icon> Optional fields missing
                    </span>
                  } @else {
                    <span class="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full">
                      <mat-icon class="!text-xs">check_circle</mat-icon> Ready
                    </span>
                  }
                </div>
              </div>

              <!-- ── Section 1: Unity Configuration ── -->
              <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 border-b border-gray-100"
                     (click)="unityOpen.set(!unityOpen())">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 flex-shrink-0">
                    <mat-icon class="!text-base !text-green-600">layers</mat-icon>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800">Unity Configuration</p>
                    <p class="text-xs text-gray-400">Project, namespace, IAM policies, deployers</p>
                  </div>
                  @if (unitySectionState() === 'error') {
                    <span class="section-badge error"><mat-icon class="!text-xs">error</mat-icon> Required fields missing</span>
                  } @else if (unitySectionState() === 'ok') {
                    <span class="section-badge ok"><mat-icon class="!text-xs">check_circle</mat-icon> Complete</span>
                  }
                  <mat-icon class="!text-gray-400 !text-lg transition-transform duration-200"
                            [class.rotate-180]="!unityOpen()">expand_more</mat-icon>
                </div>
                @if (unityOpen()) {
                  <div class="p-4 flex flex-col gap-3">
                    <!-- Row 1 -->
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="field-label">Project Name <span class="text-red-500">*</span></label>
                        <input type="text" class="field-input" [class.error]="!row.unityProject"
                               placeholder="e.g. proj-auth"
                               [value]="row.unityProject"
                               (input)="setTextField('unityProject', $event)">
                      </div>
                      <div>
                        <label class="field-label">Short Code <span class="text-red-500">*</span></label>
                        <input type="text" class="field-input" [class.error]="!row.shortCode"
                               placeholder="e.g. AUTH"
                               [value]="row.shortCode"
                               (input)="setTextField('shortCode', $event)">
                      </div>
                      <div>
                        <label class="field-label">Artifactory Namespace <span class="text-red-500">*</span></label>
                        <input type="text" class="field-input" [class.error]="!row.artifactoryNameSpace"
                               placeholder="e.g. auth-service"
                               [value]="row.artifactoryNameSpace"
                               (input)="setTextField('artifactoryNameSpace', $event)">
                      </div>
                    </div>
                    <!-- IAM Policies chip input -->
                    <div>
                      <label class="field-label">IAM Policies <span class="text-red-500">*</span></label>
                      <div class="chip-input" [class.error]="row.iamPolicies.length === 0"
                           (click)="iamInputRef.focus()">
                        @for (policy of row.iamPolicies; track policy; let pi = $index) {
                          <span class="chip">
                            {{ policy }}
                            <button type="button" (click)="removeIamPolicy(pi); $event.stopPropagation()">×</button>
                          </span>
                        }
                        <input #iamInputRef
                               type="text"
                               class="chip-text-input"
                               placeholder="{{ row.iamPolicies.length === 0 ? 'Type policy and press Enter…' : 'Add more…' }}"
                               [value]="iamPolicyInput()"
                               (input)="iamPolicyInput.set(asInputValue($event))"
                               (keydown)="onIamKeydown($event)">
                      </div>
                      <p class="text-[10px] text-gray-400 mt-1">Press Enter or comma to add each policy</p>
                    </div>
                    <!-- Row 3 -->
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="field-label">Deployers</label>
                        <input type="text" class="field-input" placeholder="user1, user2"
                               [value]="row.deployers" (input)="setTextField('deployers', $event)">
                      </div>
                      <div>
                        <label class="field-label">Contributors</label>
                        <input type="text" class="field-input" placeholder="user1, user2"
                               [value]="row.contributors" (input)="setTextField('contributors', $event)">
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- ── Section 2: AWS Configuration ── -->
              <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 border-b border-gray-100"
                     (click)="awsOpen.set(!awsOpen())">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-50 flex-shrink-0">
                    <mat-icon class="!text-base !text-orange-500">cloud</mat-icon>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800">AWS Configuration</p>
                    <p class="text-xs text-gray-400">Regions, account names, CIDR, AZs, and OU</p>
                  </div>
                  @if (awsSectionState() === 'error') {
                    <span class="section-badge error"><mat-icon class="!text-xs">error</mat-icon> Regions required</span>
                  } @else if (awsSectionState() === 'warning') {
                    <span class="section-badge warning"><mat-icon class="!text-xs">warning</mat-icon> Accounts missing</span>
                  } @else if (awsSectionState() === 'ok') {
                    <span class="section-badge ok"><mat-icon class="!text-xs">check_circle</mat-icon> Complete</span>
                  }
                  <mat-icon class="!text-gray-400 !text-lg transition-transform duration-200"
                            [class.rotate-180]="!awsOpen()">expand_more</mat-icon>
                </div>
                @if (awsOpen()) {
                  <div class="p-4 flex flex-col gap-3">
                    <!-- Row 1: Regions + toggles -->
                    <div class="grid grid-cols-3 gap-3 items-end">
                      <div class="col-span-1">
                        <label class="field-label">AWS Regions <span class="text-red-500">*</span></label>
                        <mat-select multiple class="regions-select"
                                    [class.error]="row.awsRegions.length === 0"
                                    [value]="row.awsRegions"
                                    (selectionChange)="updateSelectedRow({ awsRegions: $event.value })">
                          @for (region of awsRegions; track region) {
                            <mat-option [value]="region">{{ region }}</mat-option>
                          }
                        </mat-select>
                      </div>
                      <div class="flex items-center gap-4 pb-1">
                        <mat-checkbox [checked]="row.isSharedAccount"
                                      (change)="updateSelectedRow({ isSharedAccount: $event.checked })">
                          <span class="text-xs text-gray-700">New Account</span>
                        </mat-checkbox>
                        <mat-checkbox [checked]="row.isPnpAccount"
                                      (change)="updateSelectedRow({ isPnpAccount: $event.checked })">
                          <span class="text-xs text-gray-700">P/NP</span>
                        </mat-checkbox>
                      </div>
                    </div>
                    <!-- Row 2: Account names -->
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="field-label">DEV / NP Account</label>
                        <input type="text" class="field-input" placeholder="Account name or ID"
                               [value]="row.devNpAccount" (input)="setTextField('devNpAccount', $event)">
                      </div>
                      <div>
                        <label class="field-label">Stage Account</label>
                        <input type="text" class="field-input" placeholder="Account name or ID"
                               [value]="row.qaAccount" (input)="setTextField('qaAccount', $event)"
                               [disabled]="row.isPnpAccount">
                      </div>
                      <div>
                        <label class="field-label">Prod Account</label>
                        <input type="text" class="field-input" placeholder="Account name or ID"
                               [value]="row.prodAccount" (input)="setTextField('prodAccount', $event)">
                      </div>
                    </div>
                    <!-- Row 3: CIDR, AZs, OU -->
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="field-label">CIDR Size</label>
                        <select class="field-input"
                                [value]="row.cidrSize"
                                (change)="updateSelectedRow({ cidrSize: asSelectNumber($event) })">
                          <option [ngValue]="null">Select…</option>
                          @for (s of cidrSizes; track s) { <option [value]="s">/{{ s }}</option> }
                        </select>
                      </div>
                      <div>
                        <label class="field-label">Number of AZs</label>
                        <select class="field-input"
                                [value]="row.numberOfAzs"
                                (change)="updateSelectedRow({ numberOfAzs: asSelectNumber($event) })">
                          <option [ngValue]="null">Select…</option>
                          @for (az of azOptions; track az) { <option [value]="az">{{ az }}</option> }
                        </select>
                      </div>
                      <div>
                        <label class="field-label">Organizational Unit (OU)</label>
                        <input type="text" class="field-input" placeholder="e.g. engineering"
                               [value]="row.ou" (input)="setTextField('ou', $event)">
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- ── Section 3: Migration Source Servers ── -->
              <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 border-b border-gray-100"
                     (click)="serversOpen.set(!serversOpen())">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 flex-shrink-0">
                    <mat-icon class="!text-base !text-blue-500">dns</mat-icon>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800">Migration Source Servers</p>
                    <p class="text-xs text-gray-400">On-prem servers being migrated, per environment</p>
                  </div>
                  @if (serversSectionState() === 'pending') {
                    <span class="section-badge pending"><mat-icon class="!text-xs">pending</mat-icon> Not configured</span>
                  } @else {
                    <span class="section-badge ok"><mat-icon class="!text-xs">check_circle</mat-icon> Configured</span>
                  }
                  <mat-icon class="!text-gray-400 !text-lg transition-transform duration-200"
                            [class.rotate-180]="!serversOpen()">expand_more</mat-icon>
                </div>
                @if (serversOpen()) {
                  <div class="p-4">
                    <p class="text-xs text-gray-400 mb-3">
                      For each environment, explicitly choose <strong class="text-gray-600">No servers</strong> or list the source server hostnames.
                    </p>
                    <div class="flex gap-3">

                      <!-- DEV/NP -->
                      <div class="env-block">
                        <div class="env-bar">
                          <span class="env-label"><span class="env-dot bg-blue-400"></span>DEV / NP</span>
                          <div class="choice-toggle">
                            <button class="choice-btn"
                                    [class.active-none]="row.migrationSourceServers.dev.noServers === true"
                                    (click)="setMigrationChoice('dev', true)">
                              <mat-icon class="!text-xs">block</mat-icon> No servers
                            </button>
                            <span class="choice-divider"></span>
                            <button class="choice-btn"
                                    [class.active-servers]="row.migrationSourceServers.dev.noServers === false"
                                    (click)="setMigrationChoice('dev', false)">
                              <mat-icon class="!text-xs">dns</mat-icon> Add servers
                            </button>
                          </div>
                        </div>
                        @if (row.migrationSourceServers.dev.noServers === null) {
                          <div class="env-body">
                            <p class="text-xs text-gray-400 italic">Select an option above to configure.</p>
                          </div>
                        } @else if (row.migrationSourceServers.dev.noServers === true) {
                          <div class="env-body">
                            <div class="no-srv-badge"><mat-icon class="!text-sm">block</mat-icon> No source servers — explicitly confirmed</div>
                          </div>
                        } @else {
                          <div class="env-body flex flex-col gap-2">
                            @for (srv of row.migrationSourceServers.dev.servers; track $index; let si = $index) {
                              <div class="flex items-center gap-1.5">
                                <input type="text" class="field-input flex-1 !text-xs" placeholder="hostname or IP"
                                       [value]="srv"
                                       (input)="onMigrationServerInput($event, 'dev', si)">
                                <button class="srv-rm" (click)="removeMigrationServer('dev', si)">
                                  <mat-icon class="!text-xs">close</mat-icon>
                                </button>
                              </div>
                            }
                            <button class="add-srv-btn" (click)="addMigrationServer('dev')">
                              <mat-icon class="!text-xs">add</mat-icon> Add server
                            </button>
                          </div>
                        }
                      </div>

                      <!-- Stage -->
                      <div class="env-block">
                        <div class="env-bar">
                          <span class="env-label"><span class="env-dot bg-amber-400"></span>Stage</span>
                          <div class="choice-toggle">
                            <button class="choice-btn"
                                    [class.active-none]="row.migrationSourceServers.stage.noServers === true"
                                    (click)="setMigrationChoice('stage', true)">
                              <mat-icon class="!text-xs">block</mat-icon> No servers
                            </button>
                            <span class="choice-divider"></span>
                            <button class="choice-btn"
                                    [class.active-servers]="row.migrationSourceServers.stage.noServers === false"
                                    (click)="setMigrationChoice('stage', false)">
                              <mat-icon class="!text-xs">dns</mat-icon> Add servers
                            </button>
                          </div>
                        </div>
                        @if (row.migrationSourceServers.stage.noServers === null) {
                          <div class="env-body">
                            <p class="text-xs text-gray-400 italic">Select an option above to configure.</p>
                          </div>
                        } @else if (row.migrationSourceServers.stage.noServers === true) {
                          <div class="env-body">
                            <div class="no-srv-badge"><mat-icon class="!text-sm">block</mat-icon> No source servers — explicitly confirmed</div>
                          </div>
                        } @else {
                          <div class="env-body flex flex-col gap-2">
                            @for (srv of row.migrationSourceServers.stage.servers; track $index; let si = $index) {
                              <div class="flex items-center gap-1.5">
                                <input type="text" class="field-input flex-1 !text-xs" placeholder="hostname or IP"
                                       [value]="srv"
                                       (input)="onMigrationServerInput($event, 'stage', si)">
                                <button class="srv-rm" (click)="removeMigrationServer('stage', si)">
                                  <mat-icon class="!text-xs">close</mat-icon>
                                </button>
                              </div>
                            }
                            <button class="add-srv-btn" (click)="addMigrationServer('stage')">
                              <mat-icon class="!text-xs">add</mat-icon> Add server
                            </button>
                          </div>
                        }
                      </div>

                      <!-- Production -->
                      <div class="env-block">
                        <div class="env-bar">
                          <span class="env-label"><span class="env-dot bg-red-400"></span>Production</span>
                          <div class="choice-toggle">
                            <button class="choice-btn"
                                    [class.active-none]="row.migrationSourceServers.prod.noServers === true"
                                    (click)="setMigrationChoice('prod', true)">
                              <mat-icon class="!text-xs">block</mat-icon> No servers
                            </button>
                            <span class="choice-divider"></span>
                            <button class="choice-btn"
                                    [class.active-servers]="row.migrationSourceServers.prod.noServers === false"
                                    (click)="setMigrationChoice('prod', false)">
                              <mat-icon class="!text-xs">dns</mat-icon> Add servers
                            </button>
                          </div>
                        </div>
                        @if (row.migrationSourceServers.prod.noServers === null) {
                          <div class="env-body">
                            <p class="text-xs text-gray-400 italic">Select an option above to configure.</p>
                          </div>
                        } @else if (row.migrationSourceServers.prod.noServers === true) {
                          <div class="env-body">
                            <div class="no-srv-badge"><mat-icon class="!text-sm">block</mat-icon> No source servers — explicitly confirmed</div>
                          </div>
                        } @else {
                          <div class="env-body flex flex-col gap-2">
                            @for (srv of row.migrationSourceServers.prod.servers; track $index; let si = $index) {
                              <div class="flex items-center gap-1.5">
                                <input type="text" class="field-input flex-1 !text-xs" placeholder="hostname or IP"
                                       [value]="srv"
                                       (input)="onMigrationServerInput($event, 'prod', si)">
                                <button class="srv-rm" (click)="removeMigrationServer('prod', si)">
                                  <mat-icon class="!text-xs">close</mat-icon>
                                </button>
                              </div>
                            }
                            <button class="add-srv-btn" (click)="addMigrationServer('prod')">
                              <mat-icon class="!text-xs">add</mat-icon> Add server
                            </button>
                          </div>
                        }
                      </div>

                    </div>
                  </div>
                }
              </div>

            </div>
          }
        </div>

      </div><!-- end two-panel body -->

    } @else {
      <!-- ── JSON View ── -->
      <div class="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500">Edit JSON directly or paste from external source</span>
          @if (jsonError()) {
            <span class="text-sm text-red-600 flex items-center gap-1"><mat-icon class="!text-base">error</mat-icon>{{ jsonError() }}</span>
          } @else if (jsonContent) {
            <span class="text-sm text-green-600 flex items-center gap-1"><mat-icon class="!text-base">check_circle</mat-icon>Valid JSON</span>
          }
        </div>
        <div class="flex items-center gap-2">
          <button mat-button class="!text-sm" (click)="formatJson()"><mat-icon class="!text-base mr-1">auto_fix_high</mat-icon>Format</button>
          <button mat-button class="!text-sm" (click)="copyJson()"><mat-icon class="!text-base mr-1">content_copy</mat-icon>Copy</button>
        </div>
      </div>
      <div class="flex-1 p-4 editor-wrapper">
        <ngx-monaco-editor class="editor-instance" [options]="editorOptions" [(ngModel)]="jsonContent" (ngModelChange)="onJsonChange($event)"></ngx-monaco-editor>
      </div>
    }

    <!-- ── Footer ── -->
    <div class="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
      <div class="text-xs text-gray-500">
        @if (viewMode() === 'form' && rows().length > 0) {
          <span class="text-green-600 font-medium">{{ validationSummary().valid }}</span> ready
          @if (validationSummary().warnings > 0) { · <span class="text-amber-600 font-medium">{{ validationSummary().warnings }}</span> warnings }
          @if (validationSummary().errors > 0) { · <span class="text-red-600 font-medium">{{ validationSummary().errors }}</span> errors }
        } @else if (viewMode() === 'json' && jsonAppsCount() > 0) {
          <span class="text-blue-600 font-medium">{{ jsonAppsCount() }}</span> apps in JSON
        }
      </div>
      <div class="flex gap-2">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary" [disabled]="!canSubmit() || isSubmitting()" (click)="submit()">
          @if (isSubmitting()) { <mat-spinner diameter="16" class="mr-2"></mat-spinner> } @else { <mat-icon class="!text-base mr-1">rocket_launch</mat-icon> }
          Initialize Apps
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 90vh;
      width: 95vw;
      max-width: 1100px;
    }

    /* Field labels & inputs */
    .field-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .field-input {
      width: 100%;
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      outline: none;
      color: #111827;
      background: #fff;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .field-input.error {
      border-color: #fca5a5;
      background: #fef2f2;
    }
    .field-input:disabled {
      background: #f9fafb;
      color: #9ca3af;
      cursor: not-allowed;
    }

    /* IAM chip input */
    .chip-input {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 5px 8px;
      background: #fff;
      cursor: text;
      min-height: 36px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .chip-input:focus-within {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .chip-input.error {
      border-color: #fca5a5;
      background: #fef2f2;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: 500;
    }
    .chip button {
      background: none;
      border: none;
      cursor: pointer;
      color: #93c5fd;
      padding: 0;
      font-size: 12px;
      line-height: 1;
    }
    .chip button:hover { color: #1d4ed8; }
    .chip-text-input {
      border: none;
      outline: none;
      background: transparent;
      font-size: 12px;
      color: #111827;
      flex: 1;
      min-width: 120px;
      padding: 0;
    }
    .chip-text-input::placeholder { color: #9ca3af; }

    /* Section badges */
    .section-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 500;
    }
    .section-badge.ok     { background: #f0fdf4; color: #15803d; }
    .section-badge.error  { background: #fef2f2; color: #b91c1c; }
    .section-badge.warning { background: #fff7ed; color: #c2410c; }
    .section-badge.pending { background: #f1f5f9; color: #64748b; }

    /* AWS Regions select */
    .regions-select {
      width: 100%;
      ::ng-deep .mat-mdc-select-trigger {
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 13px;
        min-height: 34px;
      }
    }
    .regions-select.error ::ng-deep .mat-mdc-select-trigger {
      border-color: #fca5a5;
      background: #fef2f2;
    }

    /* Migration Source Servers */
    .env-block {
      flex: 1;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      min-width: 0;
    }
    .env-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 10px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      gap: 8px;
    }
    .env-label {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #374151;
      white-space: nowrap;
    }
    .env-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .choice-toggle {
      display: inline-flex;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      background: #f8fafc;
      flex-shrink: 0;
    }
    .choice-btn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 500;
      border: none;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .choice-btn:hover { background: #f1f5f9; color: #1e293b; }
    .choice-btn.active-none    { background: #fef9c3; color: #854d0e; font-weight: 600; }
    .choice-btn.active-servers { background: #eff6ff; color: #1d4ed8; font-weight: 600; }
    .choice-divider { width: 1px; background: #e2e8f0; align-self: stretch; }
    .env-body { padding: 10px; }
    .no-srv-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      background: #fefce8;
      border: 1px solid #fde047;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      color: #854d0e;
    }
    .srv-rm {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      border-radius: 4px;
      color: #9ca3af;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.12s;
    }
    .srv-rm:hover { background: #fee2e2; color: #ef4444; }
    .add-srv-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      color: #3b82f6;
      border: 1px dashed #93c5fd;
      border-radius: 6px;
      background: #eff6ff;
      cursor: pointer;
      transition: all 0.12s;
      margin-top: 2px;
    }
    .add-srv-btn:hover { background: #dbeafe; border-color: #3b82f6; }

    /* Dense mat-form-field */
    .dense-field {
      ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
      ::ng-deep .mat-mdc-text-field-wrapper { padding: 0 12px; }
      ::ng-deep .mat-mdc-form-field-infix { padding-top: 8px; padding-bottom: 8px; min-height: 38px; }
    }

    /* JSON editor */
    .editor-wrapper { flex: 1; display: flex; flex-direction: column; }
    .editor-instance { flex: 1; min-height: 350px; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }

    /* View toggle */
    .view-toggle ::ng-deep .mat-button-toggle { font-size: 13px; }
  `]
})
export class InitializeAppsDialogComponent implements OnInit, OnDestroy {
  private dialogRef = inject(MatDialogRef<InitializeAppsDialogComponent>);
  private cloudNextService = inject(CloudNextService);
  private clipboard = inject(Clipboard);
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
  iamPolicyInput = signal('');

  // Monaco options
  editorOptions = {
    theme: 'vs', language: 'json', minimap: { enabled: false },
    automaticLayout: true, fontSize: 14, lineNumbers: 'on' as const,
    scrollBeyondLastLine: false, wordWrap: 'on' as const, tabSize: 2
  };

  // Signals
  viewMode = signal<'form' | 'json'>('form');
  rows = signal<InitAppRow[]>([]);
  searchResults = signal<AppSearchResult[]>([]);
  isSearching = signal(false);
  isSubmitting = signal(false);
  jsonError = signal<string | null>(null);
  jsonAppsCount = signal(0);

  // Section layout signals
  selectedRowIndex = signal(0);
  unityOpen = signal(true);
  awsOpen = signal(true);
  serversOpen = signal(true);

  // Computed
  selectedRow = computed(() => this.rows()[this.selectedRowIndex()] ?? null);

  validationSummary = computed(() => {
    const all = this.rows();
    return {
      valid: all.filter(r => r.validationState === 'valid').length,
      warnings: all.filter(r => r.validationState === 'warning').length,
      errors: all.filter(r => r.validationState === 'error').length
    };
  });

  unitySectionState = computed(() => {
    const row = this.selectedRow();
    if (!row) return 'pending';
    if (!row.unityProject || !row.shortCode || !row.artifactoryNameSpace || row.iamPolicies.length === 0) return 'error';
    return 'ok';
  });

  awsSectionState = computed(() => {
    const row = this.selectedRow();
    if (!row) return 'pending';
    if (row.awsRegions.length === 0) return 'error';
    if (!row.devNpAccount && !row.prodAccount) return 'warning';
    return 'ok';
  });

  serversSectionState = computed(() => {
    const row = this.selectedRow();
    if (!row) return 'pending';
    const s = row.migrationSourceServers;
    const unconfigured = [s.dev, s.stage, s.prod].some(e => e.noServers === null);
    return unconfigured ? 'pending' : 'ok';
  });

  canSubmit = computed(() => {
    if (this.viewMode() === 'form') {
      return this.rows().length > 0 && this.validationSummary().errors === 0;
    }
    return this.jsonAppsCount() > 0 && !this.jsonError();
  });

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(q => q.length >= 2),
      switchMap(q => {
        this.isSearching.set(true);
        return this.cloudNextService.searchApps(q).pipe(catchError(() => of([])));
      }),
      takeUntil(this.destroy$)
    ).subscribe(results => {
      this.searchResults.set(results);
      this.isSearching.set(false);
    });

    if (this.data?.selectedApps?.length) {
      this.loadSelectedApps(this.data.selectedApps);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Row selection ──────────────────────────────────────

  selectRow(index: number): void {
    this.selectedRowIndex.set(index);
    this.unityOpen.set(true);
    this.awsOpen.set(true);
    this.serversOpen.set(true);
    this.iamPolicyInput.set('');
  }

  // ── Update selected row ────────────────────────────────

  updateSelectedRow(partial: Partial<InitAppRow>): void {
    const idx = this.selectedRowIndex();
    if (idx < 0 || idx >= this.rows().length) return;
    this.rows.update(rows => {
      const updated = [...rows];
      const updatedRow = { ...updated[idx], ...partial };
      updatedRow.validationState = this.getValidationState(updatedRow);
      updated[idx] = updatedRow;
      return updated;
    });
  }

  setTextField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.updateSelectedRow({ [field]: value } as Partial<InitAppRow>);
  }

  asInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  asSelectNumber(event: Event): number | null {
    const val = (event.target as HTMLSelectElement).value;
    return val ? Number(val) : null;
  }

  // ── IAM Policies ───────────────────────────────────────

  onIamKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addIamPolicy();
    }
  }

  addIamPolicy(): void {
    const policy = this.iamPolicyInput().trim().replace(/,+$/, '');
    if (!policy) return;
    const row = this.selectedRow();
    if (!row || row.iamPolicies.includes(policy)) { this.iamPolicyInput.set(''); return; }
    this.updateSelectedRow({ iamPolicies: [...row.iamPolicies, policy] });
    this.iamPolicyInput.set('');
  }

  removeIamPolicy(index: number): void {
    const row = this.selectedRow();
    if (!row) return;
    const policies = [...row.iamPolicies];
    policies.splice(index, 1);
    this.updateSelectedRow({ iamPolicies: policies });
  }

  // ── Migration Source Servers ───────────────────────────

  setMigrationChoice(env: 'dev' | 'stage' | 'prod', noServers: boolean): void {
    const row = this.selectedRow();
    if (!row) return;
    const migration = { ...row.migrationSourceServers };
    const envData = { ...migration[env] };
    envData.noServers = noServers;
    if (!noServers && envData.servers.length === 0) {
      envData.servers = [''];
    }
    migration[env] = envData;
    this.updateSelectedRow({ migrationSourceServers: migration });
  }

  addMigrationServer(env: 'dev' | 'stage' | 'prod'): void {
    const row = this.selectedRow();
    if (!row) return;
    const migration = { ...row.migrationSourceServers };
    migration[env] = { ...migration[env], servers: [...migration[env].servers, ''] };
    this.updateSelectedRow({ migrationSourceServers: migration });
  }

  removeMigrationServer(env: 'dev' | 'stage' | 'prod', index: number): void {
    const row = this.selectedRow();
    if (!row) return;
    const migration = { ...row.migrationSourceServers };
    const servers = [...migration[env].servers];
    servers.splice(index, 1);
    migration[env] = { ...migration[env], servers };
    this.updateSelectedRow({ migrationSourceServers: migration });
  }

  onMigrationServerInput(event: Event, env: 'dev' | 'stage' | 'prod', index: number): void {
    const value = (event.target as HTMLInputElement).value;
    const row = this.selectedRow();
    if (!row) return;
    const migration = { ...row.migrationSourceServers };
    const servers = [...migration[env].servers];
    servers[index] = value;
    migration[env] = { ...migration[env], servers };
    this.updateSelectedRow({ migrationSourceServers: migration });
  }

  // ── Search & Add Apps ──────────────────────────────────

  onSearchChange(query: string): void {
    if (query.length < 2) { this.searchResults.set([]); return; }
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
    if (this.isAppInGrid(app.appId)) return;
    this.cloudNextService.getAppById(app.appId).pipe(takeUntil(this.destroy$)).subscribe(existing => {
      const newRow = existing ? this.createRowFromApp(existing) : this.createEmptyRow(app.appId, app.appName, app.owner);
      this.rows.update(rows => [...rows, newRow]);
      this.selectedRowIndex.set(this.rows().length - 1);
    });
    this.clearSearch();
  }

  addFromPaste(): void {
    const input = this.pasteInput.trim();
    if (!input) return;
    const ids = input.split(/[,\t\n]+/).map(id => id.trim()).filter(id => id.length > 0 && !this.isAppInGrid(id));
    if (ids.length === 0) { this.pasteInput = ''; return; }
    this.cloudNextService.getAppsByIds(ids).pipe(takeUntil(this.destroy$)).subscribe(existingApps => {
      const existingMap = new Map(existingApps.map(a => [a.appId, a]));
      const newRows = ids.map(id => {
        const existing = existingMap.get(id);
        return existing ? this.createRowFromApp(existing) : this.createEmptyRow(id);
      });
      const prevLen = this.rows().length;
      this.rows.update(rows => [...rows, ...newRows]);
      if (prevLen === 0) this.selectedRowIndex.set(0);
    });
    this.pasteInput = '';
  }

  removeRow(index: number): void {
    this.rows.update(rows => rows.filter((_, i) => i !== index));
    const newLen = this.rows().length;
    if (newLen === 0) return;
    if (this.selectedRowIndex() >= newLen) {
      this.selectedRowIndex.set(newLen - 1);
    }
  }

  // ── View mode ──────────────────────────────────────────

  onViewModeChange(mode: 'form' | 'json'): void {
    if (mode === 'json' && this.viewMode() === 'form') this.syncFormToJson();
    else if (mode === 'form' && this.viewMode() === 'json') this.syncJsonToForm();
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
      if (!parsed.apps || !Array.isArray(parsed.apps)) { this.jsonError.set('Invalid format: missing "apps" array'); return; }
      this.rows.set(parsed.apps.map(app => this.requestToRow(app)));
      this.selectedRowIndex.set(0);
      this.jsonError.set(null);
    } catch {
      this.jsonError.set('Invalid JSON syntax');
    }
  }

  onJsonChange(content: string): void {
    this.jsonContent = content;
    try {
      const parsed = JSON.parse(content) as InitCloudNextRequest;
      if (!parsed.apps || !Array.isArray(parsed.apps)) { this.jsonError.set('Invalid format: missing "apps" array'); this.jsonAppsCount.set(0); return; }
      this.jsonError.set(null);
      this.jsonAppsCount.set(parsed.apps.length);
    } catch {
      this.jsonError.set('Invalid JSON syntax');
      this.jsonAppsCount.set(0);
    }
  }

  formatJson(): void {
    try { this.jsonContent = JSON.stringify(JSON.parse(this.jsonContent), null, 2); } catch { /* keep as-is */ }
  }

  copyJson(): void { this.clipboard.copy(this.jsonContent); }

  // ── Copy from first row ────────────────────────────────

  copyFromFirstRow(): void {
    const all = this.rows();
    if (all.length < 2) return;
    const first = all[0];
    this.rows.update(rows => rows.map((row, i) => {
      if (i === 0) return row;
      const updated = {
        ...row,
        shortCode: first.shortCode,
        artifactoryNameSpace: first.artifactoryNameSpace,
        iamPolicies: [...first.iamPolicies],
        isSharedAccount: first.isSharedAccount,
        isPnpAccount: first.isPnpAccount,
        awsRegions: [...first.awsRegions],
        devNpAccount: first.devNpAccount,
        qaAccount: first.qaAccount,
        prodAccount: first.prodAccount,
        cidrSize: first.cidrSize,
        numberOfAzs: first.numberOfAzs,
        ou: first.ou
      };
      updated.validationState = this.getValidationState(updated);
      return updated;
    }));
  }

  // ── Submit ─────────────────────────────────────────────

  submit(): void {
    if (!this.canSubmit()) return;
    this.isSubmitting.set(true);
    let request: InitCloudNextRequest;
    if (this.viewMode() === 'form') {
      request = this.buildRequest();
    } else {
      try { request = JSON.parse(this.jsonContent); }
      catch { this.isSubmitting.set(false); return; }
    }
    this.cloudNextService.initializeApps(request).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => this.dialogRef.close({ success: true, initialized: response.initialized, failed: response.failed }),
      error: () => this.isSubmitting.set(false)
    });
  }

  // ── Private helpers ────────────────────────────────────

  private createEmptyRow(appId: string, appName?: string, owner?: string): InitAppRow {
    const row: InitAppRow = {
      appId,
      appName: appName ?? appId,
      owner,
      unityProject: '',
      shortCode: '',
      artifactoryNameSpace: '',
      iamPolicies: [],
      isSharedAccount: false,
      isPnpAccount: false,
      awsRegions: [],
      devNpAccount: '',
      qaAccount: '',
      prodAccount: '',
      cidrSize: null,
      numberOfAzs: null,
      ou: '',
      deployers: '',
      contributors: '',
      migrationSourceServers: EMPTY_MIGRATION(),
      validationState: 'error',
      isExisting: false
    };
    row.validationState = this.getValidationState(row);
    return row;
  }

  private createRowFromApp(app: CloudNextApp): InitAppRow {
    const m = app.cloudNextMetadata;
    const row: InitAppRow = {
      appId: app.appId,
      appName: app.appName,
      owner: app.owner,
      unityProject: m?.unity?.projectName ?? '',
      shortCode: m?.unity?.projectShortCode ?? '',
      artifactoryNameSpace: m?.unity?.artifactoryNameSpace ?? '',
      iamPolicies: m?.unity?.iamPolicies ?? [],
      isSharedAccount: m?.isSharedAccount ?? false,
      isPnpAccount: m?.isPnpAccount ?? false,
      awsRegions: m?.awsRegions ?? [],
      devNpAccount: m?.awsAccountNames?.['DEV/NP'] ?? '',
      qaAccount: m?.awsAccountNames?.['QA'] ?? '',
      prodAccount: m?.awsAccountNames?.['PROD'] ?? '',
      cidrSize: m?.cidrSize ?? null,
      numberOfAzs: m?.numberOfAzs ?? null,
      ou: m?.ou ?? '',
      deployers: m?.deployers?.join(', ') ?? '',
      contributors: m?.contributors?.join(', ') ?? '',
      migrationSourceServers: EMPTY_MIGRATION(),
      validationState: 'error',
      isExisting: true
    };
    row.validationState = this.getValidationState(row);
    return row;
  }

  private requestToRow(app: CloudNextAppRequest): InitAppRow {
    const m = app.cloudNextMetadata;
    const row: InitAppRow = {
      appId: app.appId,
      appName: app.appId,
      unityProject: m.unity?.projectName ?? '',
      shortCode: m.unity?.projectShortCode ?? '',
      artifactoryNameSpace: m.unity?.artifactoryNameSpace ?? '',
      iamPolicies: m.unity?.iamPolicies ?? [],
      isSharedAccount: m.isSharedAccount ?? false,
      isPnpAccount: m.isPnpAccount ?? false,
      awsRegions: m.awsRegions ?? [],
      devNpAccount: m.awsAccountNames?.['DEV/NP'] ?? '',
      qaAccount: m.awsAccountNames?.['QA'] ?? '',
      prodAccount: m.awsAccountNames?.['PROD'] ?? '',
      cidrSize: m.cidrSize ?? null,
      numberOfAzs: m.numberOfAzs ?? null,
      ou: m.ou ?? '',
      deployers: m.deployers?.join(', ') ?? '',
      contributors: m.contributors?.join(', ') ?? '',
      migrationSourceServers: EMPTY_MIGRATION(),
      validationState: 'error',
      isExisting: false
    };
    row.validationState = this.getValidationState(row);
    return row;
  }

  private loadSelectedApps(apps: CloudNextApp[]): void {
    const newRows = apps.filter(a => a.status === 'new').map(a => this.createRowFromApp(a));
    this.rows.set(newRows);
    this.selectedRowIndex.set(0);
  }

  private getValidationState(row: InitAppRow): InitRowValidationState {
    if (!row.unityProject || !row.shortCode || !row.artifactoryNameSpace || row.iamPolicies.length === 0 || row.awsRegions.length === 0) {
      return 'error';
    }
    if (!row.devNpAccount && !row.prodAccount) return 'warning';
    return 'valid';
  }

  private buildRequest(): InitCloudNextRequest {
    return { apps: this.rows().map(r => this.rowToRequest(r)) };
  }

  private rowToRequest(row: InitAppRow): CloudNextAppRequest {
    return {
      appId: row.appId,
      isCloudNextEligible: true,
      cloudNextMetadata: {
        isSharedAccount: row.isSharedAccount,
        isPnpAccount: row.isPnpAccount,
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
        contributors: row.contributors ? row.contributors.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        unity: row.unityProject ? {
          projectName: row.unityProject,
          projectShortCode: row.shortCode,
          artifactoryNameSpace: row.artifactoryNameSpace,
          iamPolicies: row.iamPolicies
        } : undefined
      }
    };
  }
}
