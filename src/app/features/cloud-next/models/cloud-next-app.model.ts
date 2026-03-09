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
  isSharedAccount: boolean | null;
  isPnpAccount: boolean; // true = DEV-NP + PROD only (no Stage), false = DEV-NP + QA + PROD
  awsRegions: string[]; // e.g., ['us-east-1', 'us-west-2']
  awsAccountNames: {
    'DEV/NP'?: string | null;
    'QA'?: string | null; // null for P_NP accounts
    'PROD'?: string | null;
  } | null;
  cidrSize: number | null;
  numberOfAzs: number | null;
  ou: string | null;
  deployers: string[] | null;
  contributors: string[] | null;
  unity: Unity | null;
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
  isSharedAccount?: boolean;
  isPnpAccount?: boolean;
  awsRegions: string[];
  awsAccountNames?: AwsAccountNames;
  cidrSize?: number;
  numberOfAzs?: number;
  ou?: string;
  deployers?: string[];
  contributors?: string[];
  unity?: Unity;
}

export interface Unity {
  projectName: string;
  projectShortCode: string;
  artifactoryNameSpace: string;
  iamPolicies: string[];
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

// Migration Source Servers
export interface MigrationServerEnv {
  noServers: boolean | null; // null = unconfigured, true = no servers, false = has servers
  servers: string[];
}

export interface MigrationSourceServers {
  dev: MigrationServerEnv;
  stage: MigrationServerEnv;
  prod: MigrationServerEnv;
}

// Row state for Initialize Apps Dialog
export type InitRowValidationState = 'valid' | 'warning' | 'error';

export interface InitAppRow {
  appId: string;
  appName: string;
  owner?: string;
  // Unity Config
  unityProject: string;
  shortCode: string;
  artifactoryNameSpace: string;
  iamPolicies: string[];
  // AWS Config
  isSharedAccount: boolean;
  isPnpAccount: boolean;
  awsRegions: string[];
  devNpAccount: string;
  qaAccount: string;
  prodAccount: string;
  cidrSize: number | null;
  numberOfAzs: number | null;
  ou: string;
  deployers: string;
  contributors: string;
  migrationSourceServers: MigrationSourceServers;
  validationState: InitRowValidationState;
  isExisting: boolean; // true if app already exists in main table
}
