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

// Initialize Apps API interfaces
export interface InitCloudNextRequest {
  apps: CloudNextAppRequest[];
}

export interface CloudNextAppRequest {
  appId: string;
  isCloudNextEligible?: boolean;
  cloudNextMetadata: InitCloudNextMetadata;
}

export interface InitCloudNextMetadata {
  unityProject: string;
  isSharedAccount?: boolean;
  isPNpAccount?: boolean;
  awsRegions: string[];
  awsAccountNames?: AwsAccountNames;
  cidrSize?: number;
  numberOfAzs?: number;
  ou?: string;
  deployers?: string[];
  contributors?: string[];
}

export interface AwsAccountNames {
  'DEV/NP'?: string;
  'QA'?: string;
  'PROD'?: string;
}

export interface InitCloudNextResponse {
  success: boolean;
  initialized: string[];
  failed: { appId: string; reason: string }[];
}

// Row state for Initialize Apps Dialog
export type InitRowValidationState = 'valid' | 'warning' | 'error';

export interface InitAppRow {
  appId: string;
  appName: string;
  owner?: string;
  unityProject: string;
  isSharedAccount: boolean;
  isPNpAccount: boolean;
  awsRegions: string[];
  devNpAccount: string;
  qaAccount: string;
  prodAccount: string;
  cidrSize: number | null;
  numberOfAzs: number | null;
  ou: string;
  deployers: string;
  contributors: string;
  validationState: InitRowValidationState;
  isExisting: boolean; // true if app already exists in main table
}
