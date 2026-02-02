import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CloudNextMetadata } from '../../models/cloud-next-app.model';

@Component({
  selector: 'app-metadata-view',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="py-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <h4 class="font-semibold text-gray-700">Metadata</h4>
        <button mat-button color="primary" (click)="edit.emit()">
          <mat-icon>edit</mat-icon>
          Edit
        </button>
      </div>

      <!-- Missing Fields Warning -->
      @if (missingFields.length > 0) {
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <div class="flex items-center gap-2 text-amber-800">
            <mat-icon>warning</mat-icon>
            <span class="text-sm font-medium">
              Missing required fields: {{ missingFields.join(', ') }}
            </span>
          </div>
        </div>
      }

      <!-- Metadata Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Unity Project -->
        <div>
          <div class="text-xs text-gray-500 uppercase">Unity Project</div>
          @if (metadata.unityProjectName) {
            <div class="text-sm text-gray-900">{{ metadata.unityProjectName }}</div>
          } @else {
            <div class="text-sm text-red-500 flex items-center gap-1">
              <mat-icon class="text-sm">error</mat-icon>
              Not set
            </div>
          }
        </div>

        <!-- Shared Account -->
        <div>
          <div class="text-xs text-gray-500 uppercase">Shared Account</div>
          @if (metadata.isSharedAccount !== null) {
            <div class="text-sm text-gray-900">{{ metadata.isSharedAccount ? 'Yes' : 'No' }}</div>
          } @else {
            <div class="text-sm text-gray-400">—</div>
          }
        </div>

        <!-- Environment Type -->
        <div>
          <div class="text-xs text-gray-500 uppercase">Environment Type</div>
          @if (metadata.environmentType) {
            <div class="text-sm text-gray-900">{{ metadata.environmentType }}</div>
          } @else {
            <div class="text-sm text-gray-400">—</div>
          }
        </div>

        <!-- AWS Region -->
        <div>
          <div class="text-xs text-gray-500 uppercase">AWS Region</div>
          @if (metadata.awsRegion) {
            <div class="text-sm text-gray-900">{{ metadata.awsRegion }}</div>
          } @else {
            <div class="text-sm text-red-500 flex items-center gap-1">
              <mat-icon class="text-sm">error</mat-icon>
              Not set
            </div>
          }
        </div>

        <!-- AWS Dev Account -->
        <div>
          <div class="text-xs text-gray-500 uppercase">AWS Dev Account</div>
          @if (metadata.awsAccounts?.devNp) {
            <div class="text-sm text-gray-900">{{ metadata.awsAccounts!.devNp }}</div>
          } @else {
            <div class="text-sm text-red-500 flex items-center gap-1">
              <mat-icon class="text-sm">error</mat-icon>
              Not set
            </div>
          }
        </div>

        <!-- AWS QA Account -->
        <div>
          <div class="text-xs text-gray-500 uppercase">AWS QA Account</div>
          @if (metadata.awsAccounts?.qa) {
            <div class="text-sm text-gray-900">{{ metadata.awsAccounts!.qa }}</div>
          } @else {
            <div class="text-sm text-red-500 flex items-center gap-1">
              <mat-icon class="text-sm">error</mat-icon>
              Not set
            </div>
          }
        </div>

        <!-- AWS Prod Account -->
        <div>
          <div class="text-xs text-gray-500 uppercase">AWS Prod Account</div>
          @if (metadata.awsAccounts?.prod) {
            <div class="text-sm text-gray-900">{{ metadata.awsAccounts!.prod }}</div>
          } @else {
            <div class="text-sm text-gray-400">—</div>
          }
        </div>

        <!-- CIOR Size -->
        <div>
          <div class="text-xs text-gray-500 uppercase">CIOR Size</div>
          @if (metadata.ciorSize) {
            <div class="text-sm text-gray-900">{{ metadata.ciorSize }}</div>
          } @else {
            <div class="text-sm text-gray-400">—</div>
          }
        </div>

        <!-- OU -->
        <div>
          <div class="text-xs text-gray-500 uppercase">OU</div>
          @if (metadata.ou) {
            <div class="text-sm text-gray-900">{{ metadata.ou }}</div>
          } @else {
            <div class="text-sm text-gray-400">—</div>
          }
        </div>

        <!-- Deployers -->
        <div>
          <div class="text-xs text-gray-500 uppercase">Deployers</div>
          @if (metadata.deployers && metadata.deployers.length > 0) {
            <div class="text-sm text-gray-900">{{ metadata.deployers.join(', ') }}</div>
          } @else {
            <div class="text-sm text-gray-400">—</div>
          }
        </div>

        <!-- Contributors -->
        <div>
          <div class="text-xs text-gray-500 uppercase">Contributors</div>
          @if (metadata.contributors && metadata.contributors.length > 0) {
            <div class="text-sm text-gray-900">{{ metadata.contributors.join(', ') }}</div>
          } @else {
            <div class="text-sm text-gray-400">—</div>
          }
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
    if (!this.metadata.awsRegion) missing.push('AWS Region');
    if (!this.metadata.awsAccounts?.devNp) missing.push('AWS Dev Account');
    if (!this.metadata.awsAccounts?.qa) missing.push('AWS QA Account');

    return missing;
  }
}
