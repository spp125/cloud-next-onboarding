import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CloudNextStatus } from '../../models/cloud-next-app.model';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="chipClasses">
      {{ displayText }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class StatusChipComponent {
  @Input({ required: true }) status!: CloudNextStatus;

  get displayText(): string {
    const labels: Record<CloudNextStatus, string> = {
      'new': 'New',
      'initialized': 'Initialized',
      'in_dev': 'In Dev',
      'in_stage': 'In Stage',
      'in_prod': 'In Prod'
    };
    return labels[this.status] || this.status;
  }

  get chipClasses(): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    const colorClasses: Record<CloudNextStatus, string> = {
      'new': 'bg-gray-100 text-gray-800',
      'initialized': 'bg-blue-100 text-blue-800',
      'in_dev': 'bg-amber-100 text-amber-800',
      'in_stage': 'bg-purple-100 text-purple-800',
      'in_prod': 'bg-green-100 text-green-800'
    };

    return `${baseClasses} ${colorClasses[this.status] || 'bg-gray-100 text-gray-800'}`;
  }
}
