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
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Unity Section -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <mat-icon class="!text-lg text-blue-500">folder</mat-icon>
            <span class="font-semibold text-gray-700 text-sm">Unity</span>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">Project Name</span>
              <span class="text-sm font-medium text-gray-900">{{ metadata.unity?.projectName || '—' }}</span>
            </div>
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">Project Short Code</span>
              <span class="text-sm font-mono text-gray-900">{{ metadata.unity?.projectShortCode || '—' }}</span>
            </div>
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">Artifactory Namespace</span>
              <span class="text-sm font-mono text-gray-900">{{ metadata.unity?.artifactoryNameSpace || '—' }}</span>
            </div>
            <div>
              <span class="text-xs text-gray-500">IAM Policies</span>
              @if (metadata.unity?.iamPolicies?.length) {
                <div class="flex flex-wrap gap-1 mt-1">
                  @for (policy of metadata.unity!.iamPolicies; track policy) {
                    <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-mono">{{ policy }}</span>
                  }
                </div>
              } @else {
                <div class="text-sm text-gray-400 mt-1">—</div>
              }
            </div>
          </div>
        </div>

        <!-- Account & Network Section -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <mat-icon class="!text-lg text-purple-500">settings</mat-icon>
            <span class="font-semibold text-gray-700 text-sm">Account & Network</span>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">Account Type</span>
              @if (metadata.isPnpAccount) {
                <span class="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-medium">P_NP</span>
              } @else {
                <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">Standard</span>
              }
            </div>
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">Shared Account</span>
              <span class="text-sm text-gray-900">{{ metadata.isSharedAccount ? 'Yes' : 'No' }}</span>
            </div>
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">OU</span>
              <span class="text-sm text-gray-900">{{ metadata.ou || '—' }}</span>
            </div>
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">CIDR Size</span>
              <span class="text-sm text-gray-900">{{ metadata.cidrSize ?? '—' }}</span>
            </div>
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">Number of AZs</span>
              <span class="text-sm text-gray-900">{{ metadata.numberOfAzs ?? '—' }}</span>
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
              <span class="text-xs text-gray-500">DEV/NP Account</span>
              <span class="text-sm font-mono text-gray-900">{{ metadata.awsAccountNames?.['DEV/NP'] || '—' }}</span>
            </div>
            @if (!metadata.isPnpAccount) {
              <div class="flex justify-between items-start">
                <span class="text-xs text-gray-500">QA Account</span>
                <span class="text-sm font-mono text-gray-900">{{ metadata.awsAccountNames?.['QA'] || '—' }}</span>
              </div>
            }
            <div class="flex justify-between items-start">
              <span class="text-xs text-gray-500">PROD Account</span>
              <span class="text-sm font-mono text-gray-900">{{ metadata.awsAccountNames?.['PROD'] || '—' }}</span>
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

    if (!this.metadata.unity?.projectName) missing.push('Unity Project Name');
    if (!this.metadata.unity?.projectShortCode) missing.push('Unity Short Code');
    if (!this.metadata.unity?.artifactoryNameSpace) missing.push('Artifactory Namespace');
    if (!this.metadata.unity?.iamPolicies?.length) missing.push('IAM Policies');
    if (!this.metadata.awsRegions?.length) missing.push('AWS Regions');
    if (!this.metadata.awsAccountNames?.['DEV/NP']) missing.push('DEV/NP Account');
    if (!this.metadata.isPnpAccount && !this.metadata.awsAccountNames?.['QA']) {
      missing.push('QA Account');
    }

    return missing;
  }
}
