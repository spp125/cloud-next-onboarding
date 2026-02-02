import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardStats, CloudNextStatus } from '../../models/cloud-next-app.model';

interface StatCard {
  key: string;
  label: string;
  value: number;
  filterValue: CloudNextStatus | null;
  colorClasses: string;
  borderColor: string;
}

interface SelectedAppsInfo {
  total: number;
  byStatus: Record<CloudNextStatus, number>;
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <mat-card class="mb-4">
      <mat-card-content>
        <!-- Title -->
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Cloud Next Overview</h2>

        <!-- Stats Row -->
        <div class="flex flex-wrap gap-4 mb-6">
          @for (stat of statCards; track stat.key) {
            <div
              [class]="getStatCardClasses(stat)"
              (click)="onStatClick(stat.filterValue)"
              (keydown.enter)="onStatClick(stat.filterValue)"
              tabindex="0"
              role="button"
              [attr.aria-pressed]="activeFilter === stat.filterValue">
              <div class="text-3xl font-bold text-gray-900">{{ stat.value }}</div>
              <div class="text-sm text-gray-600 mt-1">{{ stat.label }}</div>
            </div>
          }
        </div>

        <!-- Divider -->
        <div class="border-t border-gray-200 my-4"></div>

        <!-- Actions Row -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Add Apps -->
          <button
            mat-raised-button
            color="primary"
            (click)="addApps.emit()">
            <mat-icon>add</mat-icon>
            Add Apps
          </button>

          <!-- Initialize -->
          <button
            mat-stroked-button
            [disabled]="!canInitialize"
            [matTooltip]="!canInitialize ? 'Select apps with New status' : ''"
            (click)="initializeApps.emit()">
            <mat-icon>play_arrow</mat-icon>
            Initialize
          </button>

          <!-- Prepare for Dev -->
          <button
            mat-stroked-button
            [disabled]="!canPrepareForDev"
            [matTooltip]="!canPrepareForDev ? 'Select initialized apps' : ''"
            (click)="prepareForDev.emit()">
            <mat-icon>build</mat-icon>
            Prepare for Dev
          </button>

          <!-- Prepare for Stage -->
          <button
            mat-stroked-button
            [disabled]="!canPrepareForStage"
            [matTooltip]="!canPrepareForStage ? 'Select apps in Dev' : ''"
            (click)="prepareForStage.emit()">
            <mat-icon>inventory_2</mat-icon>
            Prepare for Stage
          </button>

          <!-- Prepare for Prod -->
          <button
            mat-stroked-button
            [disabled]="!canPrepareForProd"
            [matTooltip]="!canPrepareForProd ? 'Select apps in Stage' : ''"
            (click)="prepareForProd.emit()">
            <mat-icon>rocket_launch</mat-icon>
            Prepare for Prod
          </button>

          <!-- Selection Info -->
          @if (selectedApps.total > 0) {
            <div class="ml-auto text-sm text-gray-600">
              <span class="font-medium">Selected:</span> {{ selectedApps.total }} app(s)
              @if (getSelectionSummary()) {
                <span class="text-gray-400">({{ getSelectionSummary() }})</span>
              }
            </div>
          }
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .stat-card {
      flex: 1;
      min-width: 140px;
      padding: 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      border-top-width: 4px;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .stat-card:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .stat-card.active {
      ring: 2px;
      box-shadow: 0 0 0 2px #3b82f6;
    }
  `]
})
export class DashboardOverviewComponent {
  @Input() stats: DashboardStats = {
    total: 0,
    notInitialized: 0,
    inDev: 0,
    inStage: 0,
    inProd: 0
  };

  @Input() activeFilter: CloudNextStatus | null = null;

  @Input() selectedApps: SelectedAppsInfo = {
    total: 0,
    byStatus: {
      'new': 0,
      'initialized': 0,
      'in_dev': 0,
      'in_stage': 0,
      'in_prod': 0
    }
  };

  @Output() filterChange = new EventEmitter<CloudNextStatus | null>();
  @Output() addApps = new EventEmitter<void>();
  @Output() initializeApps = new EventEmitter<void>();
  @Output() prepareForDev = new EventEmitter<void>();
  @Output() prepareForStage = new EventEmitter<void>();
  @Output() prepareForProd = new EventEmitter<void>();

  get statCards(): StatCard[] {
    return [
      {
        key: 'total',
        label: 'Total CN Apps',
        value: this.stats.total,
        filterValue: null,
        colorClasses: 'bg-blue-50 hover:bg-blue-100',
        borderColor: 'border-blue-500'
      },
      {
        key: 'notInitialized',
        label: 'Not Initialized',
        value: this.stats.notInitialized,
        filterValue: 'new',
        colorClasses: 'bg-gray-50 hover:bg-gray-100',
        borderColor: 'border-gray-400'
      },
      {
        key: 'inDev',
        label: 'In Dev',
        value: this.stats.inDev,
        filterValue: 'in_dev',
        colorClasses: 'bg-amber-50 hover:bg-amber-100',
        borderColor: 'border-amber-500'
      },
      {
        key: 'inStage',
        label: 'In Stage',
        value: this.stats.inStage,
        filterValue: 'in_stage',
        colorClasses: 'bg-purple-50 hover:bg-purple-100',
        borderColor: 'border-purple-500'
      },
      {
        key: 'inProd',
        label: 'In Prod',
        value: this.stats.inProd,
        filterValue: 'in_prod',
        colorClasses: 'bg-green-50 hover:bg-green-100',
        borderColor: 'border-green-500'
      }
    ];
  }

  get canInitialize(): boolean {
    return this.selectedApps.byStatus['new'] > 0;
  }

  get canPrepareForDev(): boolean {
    return this.selectedApps.byStatus['initialized'] > 0;
  }

  get canPrepareForStage(): boolean {
    return this.selectedApps.byStatus['in_dev'] > 0;
  }

  get canPrepareForProd(): boolean {
    return this.selectedApps.byStatus['in_stage'] > 0;
  }

  getStatCardClasses(stat: StatCard): string {
    const isActive = this.activeFilter === stat.filterValue;
    const activeClass = isActive ? 'active ring-2 ring-blue-500 ring-offset-2' : '';
    return `stat-card ${stat.colorClasses} border-t-4 ${stat.borderColor} ${activeClass}`;
  }

  onStatClick(filterValue: CloudNextStatus | null): void {
    // Toggle filter if clicking the same one
    if (this.activeFilter === filterValue) {
      this.filterChange.emit(null);
    } else {
      this.filterChange.emit(filterValue);
    }
  }

  getSelectionSummary(): string {
    const parts: string[] = [];
    const statusLabels: Record<CloudNextStatus, string> = {
      'new': 'New',
      'initialized': 'Initialized',
      'in_dev': 'In Dev',
      'in_stage': 'In Stage',
      'in_prod': 'In Prod'
    };

    for (const [status, count] of Object.entries(this.selectedApps.byStatus)) {
      if (count > 0) {
        parts.push(`${count} ${statusLabels[status as CloudNextStatus]}`);
      }
    }

    return parts.join(', ');
  }
}
