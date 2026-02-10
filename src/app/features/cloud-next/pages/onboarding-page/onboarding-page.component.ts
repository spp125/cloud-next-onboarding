import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CloudNextService } from '../../services/cloud-next.service';
import { CloudNextApp, CloudNextStatus, DashboardStats } from '../../models/cloud-next-app.model';
import { DashboardOverviewComponent } from '../../components/dashboard-overview/dashboard-overview.component';
import { AppsTableComponent } from '../../components/apps-table/apps-table.component';
import { AddAppsDialogComponent } from '../../components/add-apps-dialog/add-apps-dialog.component';
import { InitializeAppsDialogComponent, InitializeAppsDialogData } from '../../components/initialize-apps-dialog/initialize-apps-dialog.component';
import { PrepareAppsDialogComponent, PrepareAppsDialogData } from '../../components/prepare-apps-dialog/prepare-apps-dialog.component';

@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    DashboardOverviewComponent,
    AppsTableComponent
  ],
  template: `
    <div class="max-w-7xl mx-auto p-6">
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Cloud Next Onboarding</h1>
        <p class="text-gray-600">Manage application migration to cloud infrastructure</p>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex justify-center items-center py-12">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else {
        <!-- Dashboard Overview -->
        <app-dashboard-overview
          [stats]="stats()"
          [activeFilter]="activeFilter()"
          [selectedApps]="selectedAppsInfo()"
          (filterChange)="onFilterChange($event)"
          (addApps)="openAddAppsDialog()"
          (initializeApps)="onInitialize()"
          (prepareForDev)="onPrepareForDev()"
          (prepareForStage)="onPrepareForStage()"
          (prepareForProd)="onPrepareForProd()">
        </app-dashboard-overview>

        <!-- Apps Table -->
        <app-apps-table
          [apps]="apps()"
          [totalCount]="totalCount()"
          [pageSize]="pageSize()"
          (search)="onSearch($event)"
          (pageChange)="onPageChange($event)"
          (selectionChange)="onSelectionChange($event)"
          (editMetadata)="onEditMetadata($event)">
        </app-apps-table>
      }
    </div>
  `
})
export class OnboardingPageComponent implements OnInit {
  private cloudNextService = inject(CloudNextService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // State signals
  isLoading = signal(true);
  apps = signal<CloudNextApp[]>([]);
  stats = signal<DashboardStats>({
    total: 0,
    notInitialized: 0,
    inDev: 0,
    inStage: 0,
    inProd: 0
  });
  totalCount = signal(0);
  pageSize = signal(10);
  currentPage = signal(0);
  activeFilter = signal<CloudNextStatus | null>(null);
  searchQuery = signal('');
  selectedApps = signal<CloudNextApp[]>([]);

  // Computed values
  selectedAppsInfo = computed(() => {
    const selected = this.selectedApps();
    const byStatus: Record<CloudNextStatus, number> = {
      'new': 0,
      'initialized': 0,
      'in_dev': 0,
      'in_stage': 0,
      'in_prod': 0
    };

    selected.forEach(app => {
      byStatus[app.status]++;
    });

    return {
      total: selected.length,
      byStatus
    };
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    // Load stats and apps in parallel
    this.cloudNextService.getStats().subscribe(stats => {
      this.stats.set(stats);
    });

    this.loadApps();
  }

  loadApps(): void {
    this.cloudNextService.getApps({
      status: this.activeFilter() || undefined,
      search: this.searchQuery() || undefined,
      page: this.currentPage(),
      pageSize: this.pageSize()
    }).subscribe(response => {
      this.apps.set(response.data);
      this.totalCount.set(response.total);
      this.isLoading.set(false);
    });
  }

  onFilterChange(filter: CloudNextStatus | null): void {
    this.activeFilter.set(filter);
    this.currentPage.set(0);
    this.loadApps();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(0);
    this.loadApps();
  }

  onPageChange(event: { page: number; pageSize: number }): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadApps();
  }

  onSelectionChange(selected: CloudNextApp[]): void {
    this.selectedApps.set(selected);
  }

  openAddAppsDialog(): void {
    const dialogRef = this.dialog.open(AddAppsDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.added?.length > 0) {
        this.snackBar.open(
          `${result.added.length} app(s) added to Cloud Next`,
          'Close',
          { duration: 3000 }
        );
        this.loadData();
      }
    });
  }

  onInitialize(): void {
    const selectedNewApps = this.selectedApps().filter(app => app.status === 'new');

    const dialogData: InitializeAppsDialogData = {
      selectedApps: selectedNewApps.length > 0 ? selectedNewApps : undefined
    };

    const dialogRef = this.dialog.open(InitializeAppsDialogComponent, {
      data: dialogData,
      disableClose: false,
      panelClass: 'initialize-dialog-panel',
      width: '95vw',
      maxWidth: '1800px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success && result?.initialized?.length > 0) {
        this.snackBar.open(
          `${result.initialized.length} app(s) initialized successfully`,
          'Close',
          { duration: 3000 }
        );
        this.loadData();
      } else if (result?.failed?.length > 0) {
        this.snackBar.open(
          `Failed to initialize ${result.failed.length} app(s)`,
          'Close',
          { duration: 3000 }
        );
      }
    });
  }

  onPrepareForDev(): void {
    const apps = this.selectedApps().filter(app => app.status === 'initialized');
    if (apps.length === 0) return;

    const dialogData: PrepareAppsDialogData = {
      type: 'dev',
      apps
    };

    const dialogRef = this.dialog.open(PrepareAppsDialogComponent, {
      data: dialogData,
      width: '700px',
      maxHeight: '90vh',
      panelClass: 'prepare-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.confirmed && result?.appIds?.length > 0) {
        this.cloudNextService.prepareForDev(result.appIds).subscribe({
          next: () => {
            this.snackBar.open(`${result.appIds.length} app(s) prepared for Dev`, 'Close', { duration: 3000 });
            this.loadData();
          },
          error: () => {
            this.snackBar.open('Failed to prepare apps for Dev', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  onPrepareForStage(): void {
    const apps = this.selectedApps().filter(app => app.status === 'in_dev');
    if (apps.length === 0) return;

    const dialogData: PrepareAppsDialogData = {
      type: 'stage',
      apps
    };

    const dialogRef = this.dialog.open(PrepareAppsDialogComponent, {
      data: dialogData,
      width: '700px',
      maxHeight: '90vh',
      panelClass: 'prepare-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.confirmed && result?.appIds?.length > 0) {
        this.cloudNextService.prepareForStage(result.appIds).subscribe({
          next: () => {
            this.snackBar.open(`${result.appIds.length} app(s) prepared for Stage`, 'Close', { duration: 3000 });
            this.loadData();
          },
          error: () => {
            this.snackBar.open('Failed to prepare apps for Stage', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  onPrepareForProd(): void {
    const apps = this.selectedApps().filter(app => app.status === 'in_stage');
    if (apps.length === 0) return;

    const dialogData: PrepareAppsDialogData = {
      type: 'prod',
      apps
    };

    const dialogRef = this.dialog.open(PrepareAppsDialogComponent, {
      data: dialogData,
      width: '700px',
      maxHeight: '90vh',
      panelClass: 'prepare-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.confirmed && result?.appIds?.length > 0) {
        this.cloudNextService.prepareForProd(result.appIds).subscribe({
          next: () => {
            this.snackBar.open(`${result.appIds.length} app(s) deployed to Prod`, 'Close', { duration: 3000 });
            this.loadData();
          },
          error: () => {
            this.snackBar.open('Failed to deploy apps to Prod', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  onEditMetadata(app: CloudNextApp): void {
    // TODO: Open edit metadata dialog
    console.log('Edit metadata for:', app.appId);
  }
}
