export type RoutineLanguage = 'LD' | 'ST' | 'FBD';
export type TagScope = 'Controller' | 'Program' | 'Routine';
export type TagDataType = 'BOOL' | 'DINT' | 'REAL' | 'TIMER' | 'STRING';
export type TagUsage = 'Local' | 'Input' | 'Output' | 'InOut' | 'Public';

export interface PlcTag {
  id: string;
  name: string;
  dataType: TagDataType;
  scope: TagScope;
  scopeOwner: string;
  usage: TagUsage;
  value: boolean | number | string;
  description: string;
}

export interface UdtMember {
  name: string;
  dataType: string;
  description: string;
}

export interface UserDefinedType {
  id: string;
  name: string;
  description: string;
  members: UdtMember[];
}

export interface LadderInstruction {
  id: string;
  opcode: 'XIC' | 'XIO' | 'OTE' | 'OTL' | 'OTU' | 'TON';
  operand: string;
  presetMs?: number;
  branch?: 'MAIN' | 'PARALLEL';
}

export interface LadderRung {
  id: string;
  number: number;
  comment: string;
  instructions: LadderInstruction[];
  powerFlowActive?: boolean;
}

export interface FbdNode {
  id: string;
  type: 'INPUT_REF' | 'AND' | 'OR' | 'TON' | 'OUTPUT_REF';
  label: string;
  tagRef?: string;
  x: number;
  y: number;
  state?: boolean;
}

export interface FbdWire {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  active?: boolean;
}

export interface PlcRoutine {
  id: string;
  name: string;
  language: RoutineLanguage;
  programName: string;
  description: string;
  stCode: string;
  rungs: LadderRung[];
  fbdNodes: FbdNode[];
  fbdWires: FbdWire[];
}

export interface PlcProgram {
  id: string;
  name: string;
  taskName: string;
  mainRoutineName: string;
  routines: PlcRoutine[];
}

export interface PlcTask {
  id: string;
  name: string;
  type: 'CONTINUOUS' | 'PERIODIC' | 'EVENT';
  rateMs?: number;
  priority: number;
  watchdogMs: number;
  programs: PlcProgram[];
}

export interface SmartObject {
  id: string;
  name: string;
  category: string;
  version: string;
  author: string;
  description: string;
  templateRoutine: Partial<PlcRoutine>;
}

export interface HardwareModule {
  slot: number;
  catalogNumber: string;
  name: string;
  status: 'OK' | 'FAULT' | 'SIMULATED';
  firmware: string;
  ipAddress: string;
}

export interface GitCommitEntry {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  branch: string;
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DATA_SYNC';
  source: string;
  message: string;
}

export interface CrossReferenceHit {
  routineId: string;
  routineName: string;
  programName: string;
  language: RoutineLanguage;
  location: string;
  accessType: 'Read' | 'Write' | 'Read/Write';
}

export interface ProjectModel {
  id: string;
  name: string;
  revision: string;
  controllerName: string;
  controllerCatalog: string;
  branch: string;
  emulationRunning: boolean;
  scanTimeMs: number;
  hardware: HardwareModule[];
  userDefinedTypes: UserDefinedType[];
  tasks: PlcTask[];
  tags: PlcTag[];
  smartObjects: SmartObject[];
  commits: GitCommitEntry[];
}
