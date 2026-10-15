/**
 * Oakland International School - Institutional Workflow Engine Service
 * 
 * Manages multi-step institutional approvals and stage transitions:
 * - Result Approval: Class Teacher -> Principal -> Proprietor
 * - Leave Requests: Faculty -> Principal
 * - Expenditure Vouchers: Bursar -> Proprietor (Strict separation)
 */

import { prisma } from '../../config/prisma.js';
import { UserRole } from '../types/database.types.js';

export interface WorkflowStepDefinition {
  step_number: number;
  step_name: string;
  required_role: UserRole;
}

export interface WorkflowDefinitionData {
  id?: string;
  code: string;
  name: string;
  description?: string;
  applicable_module: string;
  steps_config: WorkflowStepDefinition[];
}

export interface WorkflowInstanceData {
  id: string;
  school_id: string;
  definition_id?: string;
  entity_type: string;
  entity_id: string;
  current_step: number;
  total_steps: number;
  status: 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  initiated_by?: string;
  initiated_by_name?: string;
  steps: any[];
}

export const BUILTIN_WORKFLOWS: Record<string, WorkflowDefinitionData> = {
  result_publication: {
    code: 'result_publication',
    name: 'Terminal Report Card Approval Pipeline',
    description: 'Teacher compilation -> Principal review -> Proprietor publishing authorization',
    applicable_module: 'scores',
    steps_config: [
      { step_number: 1, step_name: 'Teacher Marks Finalization', required_role: 'teacher' },
      { step_number: 2, step_name: 'Principal Review & Remarks', required_role: 'admin' },
      { step_number: 3, step_name: 'Proprietor Executive Publishing', required_role: 'proprietor' },
    ],
  },
  leave_request: {
    code: 'leave_request',
    name: 'Staff Leave Request Pipeline',
    description: 'Faculty application -> Principal approval',
    applicable_module: 'staff',
    steps_config: [
      { step_number: 1, step_name: 'Staff Application', required_role: 'teacher' },
      { step_number: 2, step_name: 'Principal Operational Cover Approval', required_role: 'admin' },
    ],
  },
  expenditure_voucher: {
    code: 'expenditure_voucher',
    name: 'Bursary Operational Expenditure Authorization',
    description: 'Bursar voucher prep -> Proprietor treasury sanction',
    applicable_module: 'finance',
    steps_config: [
      { step_number: 1, step_name: 'Bursar Voucher Preparation', required_role: 'bursar' },
      { step_number: 2, step_name: 'Proprietor Treasury Approval', required_role: 'proprietor' },
    ],
  },
};

class WorkflowService {
  private inMemoryInstances: Map<string, WorkflowInstanceData> = new Map();

  /**
   * Initializes a new workflow instance for an institutional entity.
   */
  public async startWorkflow(
    workflowCode: string,
    entityType: string,
    entityId: string,
    initiator?: { id?: string; name?: string; role?: string }
  ): Promise<WorkflowInstanceData> {
    const definition = BUILTIN_WORKFLOWS[workflowCode];
    if (!definition) {
      throw new Error(`Unknown workflow definition code: "${workflowCode}"`);
    }

    const instanceId = `wf-inst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const stepsConfig = definition.steps_config;
    const initialStep = stepsConfig[0];

    const initialStepRecord = {
      step_number: 1,
      step_name: initialStep.step_name,
      required_role: initialStep.required_role,
      action: 'pending',
      comments: null,
      created_at: new Date().toISOString(),
    };

    const instanceData: WorkflowInstanceData = {
      id: instanceId,
      school_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: entityType,
      entity_id: entityId,
      current_step: 1,
      total_steps: stepsConfig.length,
      status: 'in_progress',
      initiated_by: initiator?.id,
      initiated_by_name: initiator?.name || 'Initiator',
      steps: [initialStepRecord],
    };

    // Store in memory cache
    const key = `${entityType}:${entityId}`;
    this.inMemoryInstances.set(key, instanceData);


    console.log(`[WorkflowService] 🔄 Started workflow "${workflowCode}" for ${entityType} [${entityId}]`);
    return instanceData;
  }

  /**
   * Evaluates an approval or rejection step transition.
   */
  public async processStep(
    entityType: string,
    entityId: string,
    workflowCode: string,
    actor: { id?: string; name?: string; role: UserRole },
    action: 'approved' | 'rejected',
    comments?: string
  ): Promise<WorkflowInstanceData> {
    const key = `${entityType}:${entityId}`;
    let instance = this.inMemoryInstances.get(key);

    if (!instance) {
      instance = await this.startWorkflow(workflowCode, entityType, entityId, actor);
    }

    const definition = BUILTIN_WORKFLOWS[workflowCode];
    const stepsConfig = definition?.steps_config || [];
    const currentStepConfig = stepsConfig[instance.current_step - 1];

    // Check authority: Actor role must match required_role OR be executive proprietor
    if (actor.role !== 'proprietor' && currentStepConfig && currentStepConfig.required_role !== actor.role) {
      throw new Error(
        `Unauthorized step action: Step ${instance.current_step} (${currentStepConfig.step_name}) requires role "${currentStepConfig.required_role}", but current user is "${actor.role}".`
      );
    }

    // Update current step record
    const currentStepRecord = instance.steps[instance.steps.length - 1];
    if (currentStepRecord) {
      currentStepRecord.action = action;
      currentStepRecord.actor_name = actor.name || actor.role;
      currentStepRecord.actor_role = actor.role;
      currentStepRecord.comments = comments || (action === 'approved' ? 'Approved and endorsed' : 'Rejected');
      currentStepRecord.action_timestamp = new Date().toISOString();
    }

    if (action === 'rejected') {
      instance.status = 'rejected';
      console.log(`[WorkflowService] ❌ Workflow rejected at step ${instance.current_step} by ${actor.role}`);
    } else {
      // Approved
      if (instance.current_step < instance.total_steps) {
        instance.current_step += 1;
        const nextStepConfig = stepsConfig[instance.current_step - 1];
        instance.steps.push({
          step_number: instance.current_step,
          step_name: nextStepConfig.step_name,
          required_role: nextStepConfig.required_role,
          action: 'pending',
          comments: null,
          created_at: new Date().toISOString(),
        });
        console.log(`[WorkflowService] ➡️ Workflow advanced to step ${instance.current_step} (${nextStepConfig.step_name})`);
      } else {
        instance.status = 'approved';
        console.log(`[WorkflowService] ✅ Workflow fully APPROVED and completed!`);
      }
    }

    this.inMemoryInstances.set(key, instance);
    return instance;
  }

  /**
   * Retrieves active workflow instance state for an entity.
   */
  public async getWorkflowState(
    entityType: string,
    entityId: string,
    workflowCode = 'result_publication'
  ): Promise<WorkflowInstanceData> {
    const key = `${entityType}:${entityId}`;
    let instance = this.inMemoryInstances.get(key);

    if (!instance) {
      instance = await this.startWorkflow(workflowCode, entityType, entityId);
    }

    return instance;
  }
}

export const workflowService = new WorkflowService();
