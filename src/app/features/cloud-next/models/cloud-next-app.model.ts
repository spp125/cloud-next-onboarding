export interface CloudNextApp {
  appId: string;
  appName: string;
  owner: string;
  unityProject: string | null;
  lifecycleStage: string;
  isCloudNextCandidate: boolean;
  status: CloudNextStatus;
  cloudNextMetadata: CloudNextMetadata;
}

export type CloudNextStatus = 'new' | 'initialized' | 'in_dev' | 'in_stage' | 'in_prod';

export interface CloudNextMetadata {
  unityProjectName: string | null;
  isSharedAccount: boolean | null;
  environmentType: 'NP' | 'PROD' | null;
  awsRegion: string | null;
  awsAccounts: {
    devNp: string | null;
    qa: string | null;
    prod: string | null;
  } | null;
  ciorSize: string | null;
  ou: string | null;
  deployers: string[] | null;
  contributors: string[] | null;
}

export interface DashboardStats {
  total: number;
  notInitialized: number;
  inDev: number;
  inStage: number;
  inProd: number;
}

export interface AppSearchResult {
  appId: string;
  appName: string;
  owner: string;
}

export interface AddAppsRequest {
  appIds: string[];
}

export interface AddAppsResponse {
  added: string[];
  failed: string[];
}
