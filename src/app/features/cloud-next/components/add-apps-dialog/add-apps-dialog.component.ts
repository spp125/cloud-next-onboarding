import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap, takeUntil, catchError } from 'rxjs';
import { CloudNextService } from '../../services/cloud-next.service';
import { AppSearchResult } from '../../models/cloud-next-app.model';

interface SelectedApp {
  appId: string;
  appName: string;
  owner?: string;
}

@Component({
  selector: 'app-add-apps-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>Add Apps to Cloud Next</h2>

    <mat-dialog-content class="min-w-[500px]">
      <!-- Textarea for App IDs -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Enter App IDs
        </label>
        <div class="flex gap-2">
          <textarea
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows="3"
            placeholder="APP001, APP002, APP003..."
            [(ngModel)]="appIdsInput">
          </textarea>
          <button
            mat-raised-button
            color="primary"
            class="self-end"
            [disabled]="!appIdsInput.trim()"
            (click)="addFromTextarea()">
            Add
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-1">Comma, tab, or newline separated</p>
      </div>

      <!-- Divider with OR -->
      <div class="flex items-center gap-4 my-5">
        <div class="flex-1 border-t border-gray-300"></div>
        <span class="text-gray-400 text-sm font-medium">OR</span>
        <div class="flex-1 border-t border-gray-300"></div>
      </div>

      <!-- Search Input -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Search for apps
        </label>
        <mat-form-field appearance="outline" class="w-full">
          <mat-icon matPrefix>search</mat-icon>
          <input
            matInput
            placeholder="Search by app ID or app name..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)">
          @if (isSearching) {
            <mat-spinner matSuffix diameter="20"></mat-spinner>
          }
          @if (searchQuery && !isSearching) {
            <button matSuffix mat-icon-button (click)="clearSearch()">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>
        <p class="text-xs text-gray-500 -mt-4">Type at least 2 characters to search</p>
      </div>

      <!-- Search Results -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700">Search Results</label>
          @if (searchResults.length > 0) {
            <span class="text-xs text-gray-500">{{ searchResults.length }} apps found</span>
          }
        </div>

        <!-- Results List -->
        @if (searchResults.length > 0 && !isSearching) {
          <div class="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
            <table class="w-full">
              <tbody class="divide-y divide-gray-200">
                @for (app of searchResults; track app.appId) {
                  <tr [class.bg-green-50]="isSelected(app.appId)" class="hover:bg-gray-50">
                    <td class="px-4 py-2">
                      <span class="text-sm font-medium text-gray-900">{{ app.appId }}</span>
                    </td>
                    <td class="px-4 py-2">
                      <span class="text-sm text-gray-600">{{ app.appName }}</span>
                    </td>
                    <td class="px-4 py-2">
                      <span class="text-xs text-gray-500">{{ app.owner }}</span>
                    </td>
                    <td class="px-4 py-2 text-right">
                      @if (isSelected(app.appId)) {
                        <span class="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-600">
                          <mat-icon class="text-lg">check</mat-icon>
                          Added
                        </span>
                      } @else {
                        <button
                          mat-button
                          color="primary"
                          (click)="addToSelection(app)">
                          <mat-icon>add</mat-icon>
                          Add
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Loading State -->
        @if (isSearching) {
          <div class="border border-gray-300 rounded-lg p-6 text-center">
            <mat-spinner diameter="32" class="mx-auto mb-2"></mat-spinner>
            <p class="text-gray-500 text-sm">Searching...</p>
          </div>
        }

        <!-- Initial State -->
        @if (!searchQuery && searchResults.length === 0 && !isSearching) {
          <div class="border border-dashed border-gray-300 rounded-lg p-6 text-center">
            <mat-icon class="text-4xl text-gray-300 mb-2">manage_search</mat-icon>
            <p class="text-gray-500 text-sm">Search by app ID or app name to find apps</p>
          </div>
        }

        <!-- Empty State -->
        @if (searchQuery && searchResults.length === 0 && !isSearching && hasSearched) {
          <div class="border border-dashed border-gray-300 rounded-lg p-6 text-center">
            <mat-icon class="text-4xl text-gray-300 mb-2">search_off</mat-icon>
            <p class="text-gray-500 text-sm">No apps found matching "{{ searchQuery }}"</p>
          </div>
        }

        <!-- Error State -->
        @if (searchError) {
          <div class="border border-red-200 bg-red-50 rounded-lg p-4 text-center">
            <mat-icon class="text-2xl text-red-400 mb-1">error_outline</mat-icon>
            <p class="text-red-600 text-sm">Failed to search. Please try again.</p>
          </div>
        }
      </div>

      <!-- Selected Apps Section - Modern Light Design -->
      <div class="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-200 p-5">
        <!-- Background decoration -->
        <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-200/40 rounded-full blur-3xl"></div>

        <div class="relative">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <mat-icon class="text-white">playlist_add_check</mat-icon>
              </div>
              <div>
                <h3 class="text-gray-800 font-semibold text-base">Selected Apps</h3>
                <p class="text-gray-500 text-xs">Ready to add to Cloud Next</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full border border-emerald-300">
                {{ selectedApps.length }} app{{ selectedApps.length !== 1 ? 's' : '' }}
              </span>
              @if (selectedApps.length > 0) {
                <button
                  mat-button
                  class="!text-gray-500 hover:!text-red-600 hover:!bg-red-50 !rounded-lg !text-xs"
                  (click)="clearAllSelections()">
                  <mat-icon class="!text-sm mr-1">delete_sweep</mat-icon>
                  Clear
                </button>
              }
            </div>
          </div>

          <!-- Selected Apps Chips -->
          @if (selectedApps.length > 0) {
            <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              @for (app of selectedApps; track app.appId) {
                <div class="group inline-flex items-center gap-2 pl-1.5 pr-1 py-1 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200">
                  <span class="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 inline-flex items-center justify-center flex-shrink-0">
                    <mat-icon class="check-icon">check</mat-icon>
                  </span>
                  <span class="text-sm font-medium text-gray-800">{{ app.appId }}</span>
                  <span class="text-sm text-gray-500">{{ app.appName }}</span>
                  <button
                    class="w-5 h-5 inline-flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 flex-shrink-0 border-0 bg-transparent cursor-pointer"
                    (click)="removeFromSelection(app.appId)">
                    <mat-icon class="close-icon">close</mat-icon>
                  </button>
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-8">
              <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/60 border border-gray-200 flex items-center justify-center">
                <mat-icon class="!text-3xl text-gray-400">playlist_add</mat-icon>
              </div>
              <p class="text-gray-500 text-sm">No apps selected yet</p>
              <p class="text-gray-400 text-xs mt-1">Search and add apps above</p>
            </div>
          }
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="border-t border-gray-200 bg-gray-50 px-6 py-4">
      <span class="text-sm text-gray-600 mr-auto">
        <span class="font-medium">{{ selectedApps.length }}</span> app(s) will be added
      </span>
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="selectedApps.length === 0 || isSubmitting"
        (click)="submit()">
        @if (isSubmitting) {
          <mat-spinner diameter="20" class="mr-2"></mat-spinner>
        }
        Add Apps
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }

    mat-dialog-content {
      max-height: 70vh;
    }

    .check-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      line-height: 1 !important;
      color: white !important;
    }

    .close-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      line-height: 1 !important;
      color: inherit !important;
    }
  `]
})
export class AddAppsDialogComponent implements OnInit, OnDestroy {
  private dialogRef = inject(MatDialogRef<AddAppsDialogComponent>);
  private cloudNextService = inject(CloudNextService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  appIdsInput = '';
  searchQuery = '';
  searchResults: AppSearchResult[] = [];
  selectedApps: SelectedApp[] = [];
  isSearching = false;
  isSubmitting = false;
  hasSearched = false;
  searchError = false;

  ngOnInit(): void {
    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(query => query.length >= 2),
      switchMap(query => {
        this.isSearching = true;
        this.searchError = false;
        return this.cloudNextService.searchApps(query).pipe(
          catchError(() => {
            this.searchError = true;
            return [];
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(results => {
      this.searchResults = results;
      this.isSearching = false;
      this.hasSearched = true;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(query: string): void {
    if (query.length < 2) {
      this.searchResults = [];
      this.hasSearched = false;
      return;
    }
    this.searchSubject.next(query);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.hasSearched = false;
  }

  addFromTextarea(): void {
    const input = this.appIdsInput.trim();
    if (!input) return;

    // Parse comma, tab, or newline separated IDs
    const ids = input
      .split(/[,\t\n]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    // Add each ID to selection
    let addedCount = 0;
    ids.forEach(appId => {
      if (!this.isSelected(appId)) {
        this.selectedApps.push({
          appId,
          appName: '(Pending validation)'
        });
        addedCount++;
      }
    });

    // Clear textarea
    this.appIdsInput = '';
  }

  addToSelection(app: AppSearchResult): void {
    if (!this.isSelected(app.appId)) {
      this.selectedApps.push({
        appId: app.appId,
        appName: app.appName,
        owner: app.owner
      });
    }
  }

  removeFromSelection(appId: string): void {
    this.selectedApps = this.selectedApps.filter(app => app.appId !== appId);
  }

  clearAllSelections(): void {
    this.selectedApps = [];
  }

  isSelected(appId: string): boolean {
    return this.selectedApps.some(app => app.appId === appId);
  }

  submit(): void {
    if (this.selectedApps.length === 0) return;

    this.isSubmitting = true;
    const appIds = this.selectedApps.map(app => app.appId);

    this.cloudNextService.addApps({ appIds }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.dialogRef.close({
          added: response.added,
          failed: response.failed
        });
      },
      error: () => {
        this.isSubmitting = false;
        // Handle error - could show snackbar
      }
    });
  }
}
