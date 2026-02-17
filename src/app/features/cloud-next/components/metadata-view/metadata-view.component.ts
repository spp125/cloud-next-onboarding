import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CloudNextMetadata } from '../../models/cloud-next-app.model';

@Component({
  selector: 'app-metadata-view',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="py-2">
      <!-- Missing Fields Warning -->
      @if (missingFields.length > 0) {
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div class="flex items-center gap-2 text-amber-800">
            <mat-icon class="!text-lg">warning</mat-icon>
            <span class="text-sm font-medium">
              Missing: {{ missingFields.join(', ') }}
            </span>
          </div>
        </div>
      }

      <!-- Grouped Metadata Sections -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Project & Account Section -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <mat-icon class="!text-lg text-blue-500">folder</mat-icon>
            <span class="font-semibold text-gray-700 text-sm">Project</span>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">Unity Project</span>
              @if (metadata.unityProjectName) {
                <span class="text-sm font-medium text-gray-900">{{ metadata.unityProjectName }}</span>
              } @else {
                <span class="text-sm text-red-500">Not set</span>
              }
            </div>
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">Account Type</span>
              @if (metadata.isPNpAccount) {
                <span class="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-medium">P_NP</span>
              } @else {
                <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">Standard</span>
              }
            </div>
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">Shared</span>
              <span class="text-sm text-gray-900">{{ metadata.isSharedAccount ? 'Yes' : 'No' }}</span>
            </div>
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">OU</span>
              <span class="text-sm text-gray-900">{{ metadata.ou || '—' }}</span>
            </div>
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">CIDR Size</span>
              <span class="text-sm text-gray-900">{{ metadata.ciorSize || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- AWS Infrastructure Section -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <mat-icon class="!text-lg text-orange-500">cloud</mat-icon>
            <span class="font-semibold text-gray-700 text-sm">AWS Infrastructure</span>
          </div>
          <div class="space-y-3">
            <div>
              <span class="text-xs text-gray-500">Regions</span>
              @if (metadata.awsRegions?.length) {
                <div class="flex flex-wrap gap-1 mt-1">
                  @for (region of metadata.awsRegions; track region) {
                    <span class="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-mono">{{ region }}</span>
                  }
                </div>
              } @else {
                <div class="text-sm text-red-500 mt-1">Not set</div>
              }
            </div>
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">Dev/NP Account</span>
              @if (metadata.awsAccounts?.devNp) {
                <span class="text-sm font-mono text-gray-900">{{ metadata.awsAccounts!.devNp }}</span>
              } @else {
                <span class="text-sm text-red-500">Not set</span>
              }
            </div>
            @if (!metadata.isPNpAccount) {
              <div class="flex justify-between items-start">
                <span class="text-xs text-gray-500">QA Account</span>
                @if (metadata.awsAccounts?.qa) {
                  <span class="text-sm font-mono text-gray-900">{{ metadata.awsAccounts!.qa }}</span>
                } @else {
                  <span class="text-sm text-red-500">Not set</span>
                }
              </div>
            }
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">Prod Account</span>
              @if (metadata.awsAccounts?.prod) {
                <span class="text-sm font-mono text-gray-900">{{ metadata.awsAccounts!.prod }}</span>
              } @else {
                <span class="text-sm text-gray-400">—</span>
              }
            </div>
          </div>
        </div>

        <!-- Team Section -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <mat-icon class="!text-lg text-green-500">group</mat-icon>
              <span class="font-semibold text-gray-700 text-sm">Team</span>
            </div>
            <button mat-icon-button class="!w-8 !h-8" (click)="edit.emit()" matTooltip="Edit metadata">
              <mat-icon class="!text-lg text-gray-400">edit</mat-icon>
            </button>
          </div>
          <div class="space-y-3">
            <div>
              <span class="text-xs text-gray-500">Deployers</span>
              @if (metadata.deployers?.length) {
                <div class="flex flex-wrap gap-1 mt-1">
                  @for (deployer of metadata.deployers; track deployer) {
                    <span class="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">{{ deployer }}</span>
                  }
                </div>
              } @else {
                <div class="text-sm text-amber-500 mt-1">No deployers assigned</div>
              }
            </div>
            <div>
              <span class="text-xs text-gray-500">Contributors</span>
              @if (metadata.contributors?.length) {
                <div class="flex flex-wrap gap-1 mt-1">
                  @for (contributor of metadata.contributors; track contributor) {
                    <span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">{{ contributor }}</span>
                  }
                </div>
              } @else {
                <div class="text-sm text-gray-400 mt-1">—</div>
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class MetadataViewComponent {
  @Input({ required: true }) metadata!: CloudNextMetadata;
  @Output() edit = new EventEmitter<void>();

  get missingFields(): string[] {
    const missing: string[] = [];

    if (!this.metadata.unityProjectName) missing.push('Unity Project');
    if (!this.metadata.awsRegions?.length) missing.push('AWS Regions');
    if (!this.metadata.awsAccounts?.devNp) missing.push('AWS Dev Account');
    // QA account only required for non-P_NP accounts
    if (!this.metadata.isPNpAccount && !this.metadata.awsAccounts?.qa) {
      missing.push('AWS QA Account');
    }

    return missing;
  }
}
