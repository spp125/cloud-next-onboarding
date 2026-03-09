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
  CloudNextMetadata,
  InitCloudNextRequest,
  InitCloudNextResponse
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
        isSharedAccount: true,
        isPnpAccount: false,
        awsRegions: ['us-east-1'],
        awsAccountNames: { 'DEV/NP': 'shared-dev-001', 'QA': 'shared-qa-001', 'PROD': 'shared-prod-001' },
        cidrSize: 24,
        numberOfAzs: 2,
        ou: 'default',
        deployers: ['user1', 'user2'],
        contributors: ['user3', 'user4'],
        unity: { projectName: 'proj-payments', projectShortCode: 'PAY', artifactoryNameSpace: 'payments', iamPolicies: ['policy-1'] }
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
        isSharedAccount: null,
        isPnpAccount: false,
        awsRegions: [],
        awsAccountNames: null,
        cidrSize: null,
        numberOfAzs: null,
        ou: null,
        deployers: null,
        contributors: null,
        unity: null
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
        isSharedAccount: false,
        isPnpAccount: true,
        awsRegions: ['us-west-2', 'us-east-1'],
        awsAccountNames: { 'DEV/NP': 'notif-dev-001', 'PROD': 'notif-prod-001' },
        cidrSize: 22,
        numberOfAzs: 3,
        ou: 'engineering',
        deployers: null,
        contributors: null,
        unity: { projectName: 'proj-notifications', projectShortCode: 'NOT', artifactoryNameSpace: 'notifications', iamPolicies: ['policy-2'] }
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
        isSharedAccount: true,
        isPnpAccount: false,
        awsRegions: ['us-east-1', 'eu-west-1'],
        awsAccountNames: { 'DEV/NP': 'analytics-dev', 'QA': 'analytics-qa', 'PROD': 'analytics-prod' },
        cidrSize: 20,
        numberOfAzs: 2,
        ou: 'data',
        deployers: ['deployer1'],
        contributors: ['contrib1', 'contrib2'],
        unity: { projectName: 'proj-analytics', projectShortCode: 'ANL', artifactoryNameSpace: 'analytics', iamPolicies: ['policy-3', 'policy-4'] }
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
        isSharedAccount: false,
        isPnpAccount: true,
        awsRegions: ['us-east-1'],
        awsAccountNames: { 'DEV/NP': 'inv-dev', 'PROD': 'inv-prod' },
        cidrSize: 22,
        numberOfAzs: 1,
        ou: 'operations',
        deployers: ['ops-deployer'],
        contributors: ['ops-contrib'],
        unity: { projectName: 'proj-inventory', projectShortCode: 'INV', artifactoryNameSpace: 'inventory', iamPolicies: ['policy-5'] }
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
   * Initialize apps with metadata
   */
  initializeApps(request: InitCloudNextRequest): Observable<InitCloudNextResponse> {
    // TODO: Replace with real API call
    // return this.http.post<InitCloudNextResponse>(`${this.baseUrl}/apps/initialize`, request);

    // Mock: simulate successful initialization
    const initialized = request.apps.map(app => app.appId);

    // Update mock data for initialized apps
    request.apps.forEach(appRequest => {
      const existingApp = this.mockApps.find(a => a.appId === appRequest.appId);
      const meta = appRequest.cloudNextMetadata;
      const newMetadata: CloudNextMetadata = {
        isSharedAccount: meta.isSharedAccount ?? null,
        isPnpAccount: meta.isPnpAccount ?? false,
        awsRegions: meta.awsRegions ?? [],
        awsAccountNames: meta.awsAccountNames ?? null,
        cidrSize: meta.cidrSize ?? null,
        numberOfAzs: meta.numberOfAzs ?? null,
        ou: meta.ou ?? null,
        deployers: meta.deployers ?? null,
        contributors: meta.contributors ?? null,
        unity: meta.unity ?? null
      };
      if (existingApp) {
        existingApp.status = 'initialized';
        existingApp.isCloudNextCandidate = true;
        existingApp.unityProject = meta.unity?.projectName ?? null;
        existingApp.cloudNextMetadata = newMetadata;
      } else {
        this.mockApps.push({
          appId: appRequest.appId,
          appName: appRequest.appId,
          owner: 'Unknown',
          unityProject: meta.unity?.projectName ?? null,
          lifecycleStage: 'Active',
          isCloudNextCandidate: true,
          status: 'initialized',
          cloudNextMetadata: newMetadata
        });
      }
    });

    return of({
      success: true,
      initialized,
      failed: []
    }).pipe(delay(500));
  }

  /**
   * Get app by ID (for fetching existing metadata)
   */
  getAppById(appId: string): Observable<CloudNextApp | null> {
    const app = this.mockApps.find(a => a.appId === appId);
    return of(app ?? null).pipe(delay(100));
  }

  /**
   * Get multiple apps by IDs
   */
  getAppsByIds(appIds: string[]): Observable<CloudNextApp[]> {
    const apps = this.mockApps.filter(a => appIds.includes(a.appId));
    return of(apps).pipe(delay(200));
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
