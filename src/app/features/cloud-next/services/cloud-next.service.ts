import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import {
  CloudNextApp,
  CloudNextStatus,
  DashboardStats,
  AppSearchResult,
  AddAppsRequest,
  AddAppsResponse,
  CloudNextMetadata
} from '../models/cloud-next-app.model';

@Injectable({
  providedIn: 'root'
})
export class CloudNextService {
  private http = inject(HttpClient);
  private baseUrl = '/api/cloud-next';

  // Mock data for development
  private mockApps: CloudNextApp[] = [
    {
      appId: 'APP001',
      appName: 'Payment Service',
      owner: 'Karen Smith',
      unityProject: 'proj-payments',
      lifecycleStage: 'Active',
      isCloudNextCandidate: true,
      status: 'in_dev',
      cloudNextMetadata: {
        unityProjectName: 'proj-payments',
        isSharedAccount: true,
        environmentType: 'NP',
        awsRegion: 'us-east-1',
        awsAccounts: { devNp: 'shared-dev-001', qa: 'shared-qa-001', prod: 'shared-prod-001' },
        ciorSize: 'Small',
        ou: 'default',
        deployers: ['user1', 'user2'],
        contributors: ['user3', 'user4']
      }
    },
    {
      appId: 'APP002',
      appName: 'User Auth Service',
      owner: 'John Doe',
      unityProject: null,
      lifecycleStage: 'Active',
      isCloudNextCandidate: true,
      status: 'new',
      cloudNextMetadata: {
        unityProjectName: null,
        isSharedAccount: null,
        environmentType: null,
        awsRegion: null,
        awsAccounts: null,
        ciorSize: null,
        ou: null,
        deployers: null,
        contributors: null
      }
    },
    {
      appId: 'APP003',
      appName: 'Notification Engine',
      owner: 'Sarah Wilson',
      unityProject: 'proj-notifications',
      lifecycleStage: 'Active',
      isCloudNextCandidate: true,
      status: 'new',
      cloudNextMetadata: {
        unityProjectName: 'proj-notifications',
        isSharedAccount: false,
        environmentType: 'PROD',
        awsRegion: 'us-west-2',
        awsAccounts: { devNp: 'notif-dev-001', qa: 'notif-qa-001', prod: 'notif-prod-001' },
        ciorSize: 'Medium',
        ou: 'engineering',
        deployers: null,
        contributors: null
      }
    },
    {
      appId: 'APP004',
      appName: 'Analytics Dashboard',
      owner: 'Mike Johnson',
      unityProject: 'proj-analytics',
      lifecycleStage: 'Active',
      isCloudNextCandidate: true,
      status: 'in_stage',
      cloudNextMetadata: {
        unityProjectName: 'proj-analytics',
        isSharedAccount: true,
        environmentType: 'PROD',
        awsRegion: 'us-east-1',
        awsAccounts: { devNp: 'analytics-dev', qa: 'analytics-qa', prod: 'analytics-prod' },
        ciorSize: 'Large',
        ou: 'data',
        deployers: ['deployer1'],
        contributors: ['contrib1', 'contrib2']
      }
    },
    {
      appId: 'APP005',
      appName: 'Inventory Manager',
      owner: 'Lisa Chen',
      unityProject: 'proj-inventory',
      lifecycleStage: 'Active',
      isCloudNextCandidate: true,
      status: 'in_prod',
      cloudNextMetadata: {
        unityProjectName: 'proj-inventory',
        isSharedAccount: false,
        environmentType: 'PROD',
        awsRegion: 'us-east-1',
        awsAccounts: { devNp: 'inv-dev', qa: 'inv-qa', prod: 'inv-prod' },
        ciorSize: 'Medium',
        ou: 'operations',
        deployers: ['ops-deployer'],
        contributors: ['ops-contrib']
      }
    }
  ];

  /**
   * Get all Cloud Next apps with optional filtering
   */
  getApps(filters?: {
    status?: CloudNextStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Observable<{ data: CloudNextApp[]; total: number }> {
    // TODO: Replace with real API call
    // return this.http.get<{ data: CloudNextApp[]; total: number }>(`${this.baseUrl}/apps`, { params });

    let filtered = [...this.mockApps];

    if (filters?.status) {
      filtered = filtered.filter(app => app.status === filters.status);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(app =>
        app.appId.toLowerCase().includes(search) ||
        app.appName.toLowerCase().includes(search) ||
        app.owner.toLowerCase().includes(search)
      );
    }

    return of({ data: filtered, total: filtered.length }).pipe(delay(300));
  }

  /**
   * Get dashboard statistics
   */
  getStats(): Observable<DashboardStats> {
    // TODO: Replace with real API call
    // return this.http.get<DashboardStats>(`${this.baseUrl}/apps/stats`);

    const stats: DashboardStats = {
      total: this.mockApps.length,
      notInitialized: this.mockApps.filter(a => a.status === 'new').length,
      inDev: this.mockApps.filter(a => a.status === 'in_dev').length,
      inStage: this.mockApps.filter(a => a.status === 'in_stage').length,
      inProd: this.mockApps.filter(a => a.status === 'in_prod').length
    };

    return of(stats).pipe(delay(200));
  }

  /**
   * Search apps (for Add Apps dialog)
   */
  searchApps(query: string): Observable<AppSearchResult[]> {
    // TODO: Replace with real Elasticsearch API call
    // return this.http.get<AppSearchResult[]>(`${this.baseUrl}/apps/search`, { params: { q: query } });

    const mockSearchResults: AppSearchResult[] = [
      { appId: 'APP010', appName: 'Compass Service', owner: 'John Smith' },
      { appId: 'APP011', appName: 'Compass API', owner: 'Sarah Lee' },
      { appId: 'APP012', appName: 'Compass Dashboard', owner: 'Mike Chen' },
      { appId: 'APP013', appName: 'Compass Analytics', owner: 'Emily Davis' },
      { appId: 'APP006', appName: 'Order Processing', owner: 'David Brown' },
      { appId: 'APP007', appName: 'Customer Portal', owner: 'Alex Kim' },
      { appId: 'APP008', appName: 'Billing System', owner: 'Chris Lee' },
    ];

    const search = query.toLowerCase();
    const filtered = mockSearchResults.filter(app =>
      app.appId.toLowerCase().includes(search) ||
      app.appName.toLowerCase().includes(search) ||
      app.owner.toLowerCase().includes(search)
    );

    return of(filtered).pipe(delay(500));
  }

  /**
   * Add apps to Cloud Next program
   */
  addApps(request: AddAppsRequest): Observable<AddAppsResponse> {
    // TODO: Replace with real API call
    // return this.http.put<AddAppsResponse>(`${this.baseUrl}/apps`, request);

    return of({
      added: request.appIds,
      failed: []
    }).pipe(delay(500));
  }

  /**
   * Update app metadata
   */
  updateMetadata(appId: string, metadata: Partial<CloudNextMetadata>): Observable<CloudNextApp> {
    // TODO: Replace with real API call
    // return this.http.patch<CloudNextApp>(`${this.baseUrl}/apps/${appId}/metadata`, { cloudNextMetadata: metadata });

    const app = this.mockApps.find(a => a.appId === appId);
    if (app) {
      app.cloudNextMetadata = { ...app.cloudNextMetadata, ...metadata };
    }
    return of(app!).pipe(delay(300));
  }

  /**
   * Initialize apps
   */
  initializeApps(appIds: string[]): Observable<{ success: boolean }> {
    // TODO: Replace with real API call
    // return this.http.post<{ success: boolean }>(`${this.baseUrl}/apps/initialize`, { appIds });

    return of({ success: true }).pipe(delay(500));
  }

  /**
   * Prepare for Dev
   */
  prepareForDev(appIds: string[]): Observable<{ success: boolean }> {
    // return this.http.post<{ success: boolean }>(`${this.baseUrl}/apps/prepare-dev`, { appIds });
    return of({ success: true }).pipe(delay(500));
  }

  /**
   * Prepare for Stage
   */
  prepareForStage(appIds: string[]): Observable<{ success: boolean }> {
    // return this.http.post<{ success: boolean }>(`${this.baseUrl}/apps/prepare-stage`, { appIds });
    return of({ success: true }).pipe(delay(500));
  }

  /**
   * Prepare for Prod
   */
  prepareForProd(appIds: string[]): Observable<{ success: boolean }> {
    // return this.http.post<{ success: boolean }>(`${this.baseUrl}/apps/prepare-prod`, { appIds });
    return of({ success: true }).pipe(delay(500));
  }
}
