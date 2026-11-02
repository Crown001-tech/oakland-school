/** The custom request log: how a school's request is handled and where it stands. */
export const REQUEST_STATUSES = ['open', 'accepted', 'in_progress', 'done', 'declined'] as const;
export const REQUEST_APPROACHES = ['setting', 'module', 'product_feature', 'custom_work'] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestApproach = (typeof REQUEST_APPROACHES)[number];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Open',
  accepted: 'Accepted',
  in_progress: 'In progress',
  done: 'Done',
  declined: 'Declined',
};

// The preferred order: a setting or a module switch first, custom work last
export const APPROACH_LABELS: Record<RequestApproach, string> = {
  setting: 'A setting',
  module: 'A module switch',
  product_feature: 'A feature for every school',
  custom_work: 'Custom work for this school',
};
