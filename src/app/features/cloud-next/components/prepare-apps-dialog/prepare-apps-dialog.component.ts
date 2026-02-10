import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CloudNextApp } from '../../models/cloud-next-app.model';

export type PrepareType = 'dev' | 'stage' | 'prod';

export interface PrepareAppsDialogData {
  type: PrepareType;
  apps: CloudNextApp[];
}

interface PrepareConfig {
  title: string;
  subtitle: string;
  icon: string;
  headerGradient: string;
  bannerBg: string;
  bannerBorder: string;
  bannerIcon: string;
  bannerIconColor: string;
  bannerTitle: string;
  bannerMessage: string;
  buttonBg: string;
  buttonHover: string;
  buttonText: string;
  targetStatus: string;
  targetBadgeBg: string;
  targetBadgeText: string;
  currentStatus: string;
  currentBadgeBg: string;
  currentBadgeText: string;
  requiresConfirmation: boolean;
}

const PREPARE_CONFIGS: Record<PrepareType, PrepareConfig> = {
  dev: {
    title: 'Prepare for Dev',
    subtitle: 'Provision Dev/NP infrastructure',
    icon: 'build',
    headerGradient: 'from-amber-500 to-orange-500',
    bannerBg: 'bg-amber-50',
    bannerBorder: 'border-amber-200',
    bannerIcon: 'rocket_launch',
    bannerIconColor: 'text-amber-600',
    bannerTitle: 'Ready to prepare apps for Dev environment',
    bannerMessage: 'This action will provision Dev/NP infrastructure for the selected apps.',
    buttonBg: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700',
    buttonText: 'Prepare for Dev',
    targetStatus: 'In Dev',
    targetBadgeBg: 'bg-amber-100',
    targetBadgeText: 'text-amber-800',
    currentStatus: 'Initialized',
    currentBadgeBg: 'bg-blue-100',
    currentBadgeText: 'text-blue-800',
    requiresConfirmation: false
  },
  stage: {
    title: 'Prepare for Stage',
    subtitle: 'Deploy to staging environment',
    icon: 'inventory_2',
    headerGradient: 'from-purple-500 to-indigo-500',
    bannerBg: 'bg-purple-50',
    bannerBorder: 'border-purple-200',
    bannerIcon: 'rocket_launch',
    bannerIconColor: 'text-purple-600',
    bannerTitle: 'Ready to prepare apps for Stage environment',
    bannerMessage: 'This action will deploy the apps to the staging environment for QA testing.',
    buttonBg: 'bg-purple-600',
    buttonHover: 'hover:bg-purple-700',
    buttonText: 'Prepare for Stage',
    targetStatus: 'In Stage',
    targetBadgeBg: 'bg-purple-100',
    targetBadgeText: 'text-purple-800',
    currentStatus: 'In Dev',
    currentBadgeBg: 'bg-amber-100',
    currentBadgeText: 'text-amber-800',
    requiresConfirmation: false
  },
  prod: {
    title: 'Prepare for Production',
    subtitle: 'Deploy to production environment',
    icon: 'rocket_launch',
    headerGradient: 'from-green-500 to-emerald-500',
    bannerBg: 'bg-red-50',
    bannerBorder: 'border-red-200',
    bannerIcon: 'warning',
    bannerIconColor: 'text-red-600',
    bannerTitle: 'You are about to deploy to Production',
    bannerMessage: 'Please ensure all testing is complete and approvals are in place.',
    buttonBg: 'bg-green-600',
    buttonHover: 'hover:bg-green-700',
    buttonText: 'Deploy to Production',
    targetStatus: 'In Prod',
    targetBadgeBg: 'bg-green-100',
    targetBadgeText: 'text-green-800',
    currentStatus: 'In Stage',
    currentBadgeBg: 'bg-purple-100',
    currentBadgeText: 'text-purple-800',
    requiresConfirmation: true
  }
};

@Component({
  selector: 'app-prepare-apps-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  template: `
    <!-- Dialog Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg"
             [ngClass]="config.headerGradient">
          <mat-icon class="text-white">{{ config.icon }}</mat-icon>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900">{{ config.title }}</h3>
          <p class="text-sm text-gray-500">{{ config.subtitle }}</p>
        </div>
      </div>
      <button mat-icon-button mat-dialog-close class="!text-gray-400 hover:!text-gray-600">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <!-- Dialog Content -->
    <div class="p-6 overflow-y-auto" style="max-height: 60vh;">
      <!-- Banner -->
      <div class="rounded-xl p-4 mb-6 border"
           [ngClass]="[config.bannerBg, config.bannerBorder]">
        <div class="flex items-center gap-3">
          <mat-icon class="!text-2xl" [ngClass]="config.bannerIconColor">{{ config.bannerIcon }}</mat-icon>
          <div>
            <p class="font-semibold text-gray-900">{{ config.bannerTitle.replace('{count}', apps.length.toString()) }}</p>
            <p class="text-sm text-gray-600">{{ config.bannerMessage }}</p>
          </div>
        </div>
      </div>

      <!-- Apps Table -->
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-8 px-2 py-3"></th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">App ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">App Name</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Current</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase"></th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Target</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (app of apps; track app.appId) {
              <!-- App Row -->
              <tr class="hover:bg-gray-50 cursor-pointer" (click)="toggleRow(app.appId)">
                <td class="px-2 py-3 text-center">
                  <mat-icon class="!text-gray-400 !text-lg transition-transform"
                            [class.rotate-90]="expandedRows().has(app.appId)">
                    chevron_right
                  </mat-icon>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm font-medium text-gray-900">{{ app.appId }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm text-gray-700">{{ app.appName }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [ngClass]="[config.currentBadgeBg, config.currentBadgeText]">
                    {{ config.currentStatus }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <mat-icon class="!text-gray-400">arrow_forward</mat-icon>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [ngClass]="[config.targetBadgeBg, config.targetBadgeText]">
                    {{ config.targetStatus }}
                  </span>
                </td>
              </tr>
              <!-- Metadata Row (expandable) -->
              @if (expandedRows().has(app.appId)) {
                <tr class="bg-gray-50">
                  <td colspan="6" class="px-4 py-4">
                    <div class="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span class="text-gray-500 font-medium">Unity Project</span>
                        <p class="text-gray-900">{{ app.cloudNextMetadata?.unityProjectName || '-' }}</p>
                      </div>
                      <div>
                        <span class="text-gray-500 font-medium">AWS Region</span>
                        <p class="text-gray-900">{{ app.cloudNextMetadata?.awsRegion || '-' }}</p>
                      </div>
                      <div>
                        <span class="text-gray-500 font-medium">OU</span>
                        <p class="text-gray-900">{{ app.cloudNextMetadata?.ou || '-' }}</p>
                      </div>
                      <div>
                        <span class="text-gray-500 font-medium">Dev/NP Account</span>
                        <p class="text-gray-900">{{ app.cloudNextMetadata?.awsAccounts?.devNp || '-' }}</p>
                      </div>
                      <div>
                        <span class="text-gray-500 font-medium">QA Account</span>
                        <p class="text-gray-900">{{ app.cloudNextMetadata?.awsAccounts?.qa || '-' }}</p>
                      </div>
                      <div>
                        <span class="text-gray-500 font-medium">Prod Account</span>
                        <p class="text-gray-900">{{ app.cloudNextMetadata?.awsAccounts?.prod || '-' }}</p>
                      </div>
                      <div>
                        <span class="text-gray-500 font-medium">CIDR Size</span>
                        <p class="text-gray-900">{{ app.cloudNextMetadata?.ciorSize ? '/' + app.cloudNextMetadata.ciorSize : '-' }}</p>
                      </div>
                      <div>
                        <span class="text-gray-500 font-medium">Environment Type</span>
                        <p class="text-gray-900">{{ app.cloudNextMetadata?.environmentType || '-' }}</p>
                      </div>
                      <div>
                        <span class="text-gray-500 font-medium">Shared Account</span>
                        <p class="text-gray-900">{{ app.cloudNextMetadata?.isSharedAccount ? 'Yes' : 'No' }}</p>
                      </div>
                      <div>
                        <span class="text-gray-500 font-medium">Deployers</span>
                        <p class="text-gray-900">{{ app.cloudNextMetadata?.deployers?.join(', ') || '-' }}</p>
                      </div>
                      <div>
                        <span class="text-gray-500 font-medium">Contributors</span>
                        <p class="text-gray-900">{{ app.cloudNextMetadata?.contributors?.join(', ') || '-' }}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Info Note -->
      <div class="mt-4 flex items-start gap-2 text-sm text-gray-600">
        <mat-icon class="!text-blue-500 !text-lg">info</mat-icon>
        <p>Click on any row to view metadata details before proceeding.</p>
      </div>

      <!-- Confirmation Checkbox (Prod only) -->
      @if (config.requiresConfirmation) {
        <div class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label class="flex items-start gap-3 cursor-pointer">
            <mat-checkbox
              [(ngModel)]="confirmed"
              class="mt-0.5">
            </mat-checkbox>
            <span class="text-sm text-gray-700">
              I confirm that all testing has been completed and this deployment has been approved for production.
            </span>
          </label>
        </div>
      }
    </div>

    <!-- Dialog Footer -->
    <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-raised-button
        [disabled]="isSubmitting() || (config.requiresConfirmation && !confirmed)"
        [ngClass]="[config.buttonBg, config.buttonHover]"
        class="!text-white"
        (click)="submit()">
        @if (isSubmitting()) {
          <mat-spinner diameter="18" class="mr-2"></mat-spinner>
        } @else {
          <mat-icon class="mr-1">{{ config.icon }}</mat-icon>
        }
        {{ config.buttonText }}
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      max-width: 700px;
      width: 100%;
    }

    .rotate-90 {
      transform: rotate(90deg);
    }

    mat-checkbox {
      ::ng-deep .mdc-checkbox {
        padding: 0;
      }
    }
  `]
})
export class PrepareAppsDialogComponent {
  private dialogRef = inject(MatDialogRef<PrepareAppsDialogComponent>);
  private data = inject<PrepareAppsDialogData>(MAT_DIALOG_DATA);

  apps: CloudNextApp[] = this.data.apps;
  config: PrepareConfig = PREPARE_CONFIGS[this.data.type];

  confirmed = false;
  isSubmitting = signal(false);
  expandedRows = signal<Set<string>>(new Set());

  toggleRow(appId: string): void {
    this.expandedRows.update(rows => {
      const newRows = new Set(rows);
      if (newRows.has(appId)) {
        newRows.delete(appId);
      } else {
        newRows.add(appId);
      }
      return newRows;
    });
  }

  submit(): void {
    if (this.config.requiresConfirmation && !this.confirmed) {
      return;
    }

    this.isSubmitting.set(true);

    // Return the app IDs to the parent component for API call
    const appIds = this.apps.map(app => app.appId);

    // Simulate a small delay then close with result
    setTimeout(() => {
      this.dialogRef.close({
        confirmed: true,
        appIds
      });
    }, 300);
  }
}
