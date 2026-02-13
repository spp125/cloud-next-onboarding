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
  icon: string;
  value: number;
  filterValue: CloudNextStatus | null;
  iconColor: string;
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
    <div class="mb-6">
      <!-- Title -->
      <h2 class="text-lg font-semibold text-gray-700 mb-4">Cloud Next Overview</h2>

      <!-- Stats Grid -->
      <div class="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        @for (stat of statCards; track stat.key) {
          <mat-card
            class="stat-card cursor-pointer transition-all"
            [class.ring-2]="activeFilter === stat.filterValue"
            [class.ring-blue-500]="activeFilter === stat.filterValue"
            (click)="onStatClick(stat.filterValue)"
            (keydown.enter)="onStatClick(stat.filterValue)"
            tabindex="0"
            role="button"
            [attr.aria-pressed]="activeFilter === stat.filterValue">
            <mat-card-header>
              <div class="flex items-center gap-x-2">
                <mat-icon class="!w-4 !h-4 !text-base" [ngClass]="stat.iconColor">{{ stat.icon }}</mat-icon>
                <div class="font-medium tracking-tight text-gray-700">{{ stat.label }}</div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="text-4xl font-semibold tabular-nums text-gray-900">{{ stat.value }}</div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      <!-- Actions Row -->
      <div class="flex flex-wrap items-center gap-3 mt-6">
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
          (click)="prepareForDev.emit()">
          <mat-icon>build</mat-icon>
          Prepare for Dev
        </button>

        <!-- Prepare for Stage -->
        <button
          mat-stroked-button
          (click)="prepareForStage.emit()">
          <mat-icon>inventory_2</mat-icon>
          Prepare for Stage
        </button>

        <!-- Prepare for Prod -->
        <button
          mat-stroked-button
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
    </div>
  `,
  styles: []
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
        label: 'Total Apps',
        icon: 'apps',
        value: this.stats.total,
        filterValue: null,
        iconColor: 'text-blue-600'
      },
      {
        key: 'notInitialized',
        label: 'Not Initialized',
        icon: 'pending',
        value: this.stats.notInitialized,
        filterValue: 'new',
        iconColor: 'text-gray-500'
      },
      {
        key: 'inDev',
        label: 'In Dev',
        icon: 'build',
        value: this.stats.inDev,
        filterValue: 'in_dev',
        iconColor: 'text-amber-600'
      },
      {
        key: 'inStage',
        label: 'In Stage',
        icon: 'inventory_2',
        value: this.stats.inStage,
        filterValue: 'in_stage',
        iconColor: 'text-purple-600'
      },
      {
        key: 'inProd',
        label: 'In Prod',
        icon: 'rocket_launch',
        value: this.stats.inProd,
        filterValue: 'in_prod',
        iconColor: 'text-green-600'
      }
    ];
  }

  get canInitialize(): boolean {
    return this.selectedApps.byStatus['new'] > 0;
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
