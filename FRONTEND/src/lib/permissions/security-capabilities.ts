/**
 * Security & Reception Capability Permissions
 * Oakland International School
 * 
 * Provides granular capability checking for Security & Reception staff,
 * ensuring strict isolation from academic, financial, and administrative operations.
 */

export type SecurityCapability =
  | 'visitor.view'
  | 'visitor.manage'
  | 'pickup.view'
  | 'pickup.verify'
  | 'movement.view'
  | 'movement.record'
  | 'staff_gate.view'
  | 'staff_gate.record'
  | 'delivery.view'
  | 'delivery.manage'
  | 'incident.view'
  | 'incident.report'
  | 'emergency.view'
  | 'emergency.manage';

export const SECURITY_CAPABILITIES: Record<SecurityCapability, {
  name: string;
  description: string;
  category: 'visitors' | 'pickup' | 'movement' | 'staff' | 'deliveries' | 'incidents' | 'emergency';
}> = {
  'visitor.view': {
    name: 'View Visitors',
    description: 'Inspect current visitor roster, passes, and check-in history',
    category: 'visitors',
  },
  'visitor.manage': {
    name: 'Manage Visitors',
    description: 'Register visitors, issue visitor passes, notify hosts, and process checkout',
    category: 'visitors',
  },
  'pickup.view': {
    name: 'View Pickups',
    description: 'Inspect student dismissal clearance logs and authorized escorts roster',
    category: 'pickup',
  },
  'pickup.verify': {
    name: 'Verify Pickup',
    description: 'Enter 4-digit pickup PIN, verify guardian escort identity, clear departure, or flag unauthorized attempts',
    category: 'pickup',
  },
  'movement.view': {
    name: 'View Student Movements',
    description: 'Inspect school-hour student gate pass departures and returns',
    category: 'movement',
  },
  'movement.record': {
    name: 'Record Student Movements',
    description: 'Issue school-hour gate passes with teacher sign-off and log student returns',
    category: 'movement',
  },
  'staff_gate.view': {
    name: 'View Staff Gate Logs',
    description: 'Inspect daily staff perimeter entry and exit transit logs',
    category: 'staff',
  },
  'staff_gate.record': {
    name: 'Record Staff Gate Transit',
    description: 'Log staff entry and exit movements with vehicle registration where applicable',
    category: 'staff',
  },
  'delivery.view': {
    name: 'View Deliveries',
    description: 'Inspect parcel intake logs, courier details, and recipient notifications',
    category: 'deliveries',
  },
  'delivery.manage': {
    name: 'Manage Deliveries',
    description: 'Log courier intake, tag internal recipient staff/department, and record collection sign-off',
    category: 'deliveries',
  },
  'incident.view': {
    name: 'View Security Incidents',
    description: 'Inspect security log entries, active safety warnings, and status tracking',
    category: 'incidents',
  },
  'incident.report': {
    name: 'Report Security Incidents',
    description: 'Log perimeter safety incidents, select severity tiers, and trigger automatic escalation to Principal',
    category: 'incidents',
  },
  'emergency.view': {
    name: 'View Emergency Contacts',
    description: 'Access 1-tap rapid dial directory for police, fire, clinic, and crisis hotlines',
    category: 'emergency',
  },
  'emergency.manage': {
    name: 'Manage Emergency Directory',
    description: 'Update institutional safety contact lines and emergency service numbers',
    category: 'emergency',
  },
};

/**
 * Checks if a user role has access to a specific security capability.
 * Unified security role has all standard gate and reception capabilities.
 * Administrators have universal capability.
 */
export function hasSecurityCapability(role: string | null | undefined, capability: SecurityCapability): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  
  if (normalized === 'admin' || normalized === 'principal' || normalized === 'proprietor') {
    return true;
  }
  
  if (normalized === 'security') {
    // Standard security role has access to all operational security capabilities
    return true;
  }
  
  return false;
}
