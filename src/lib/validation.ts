// Simple validation functions without Zod due to TypeScript issues

export function validateUser(data: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required');
  } else if (data.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email address');
  }
  
  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  if (!data.role || !['admin', 'supervisor', 'agent'].includes(data.role)) {
    errors.push('Invalid role');
  }
  
  return errors.length > 0 ? { success: false, errors } : { success: true };
}

export function validateCustomer(data: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Customer name is required');
  } else if (data.name.length > 100) {
    errors.push('Customer name must be less than 100 characters');
  }
  
  if (data.contactTitle && data.contactTitle.length > 100) {
    errors.push('Contact title must be less than 100 characters');
  }
  
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email address');
  }
  
  if (data.phone && data.phone.length > 20) {
    errors.push('Phone number must be less than 20 characters');
  }
  
  if (!data.agentId || data.agentId.trim().length === 0) {
    errors.push('Agent ID is required');
  }
  
  return errors.length > 0 ? { success: false, errors } : { success: true };
}

export function validateInteraction(data: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  if (!data.customerId || data.customerId.trim().length === 0) {
    errors.push('Customer ID is required');
  }
  
  if (!data.agentId || data.agentId.trim().length === 0) {
    errors.push('Agent ID is required');
  }
  
  if (data.callDuration !== undefined && (typeof data.callDuration !== 'number' || data.callDuration < 0)) {
    errors.push('Call duration must be a positive number');
  }
  
  const validFollowUpStatuses = ['pending', 'in-progress', 'completed', 'closed'];
  if (data.followUpStatus && !validFollowUpStatuses.includes(data.followUpStatus)) {
    errors.push('Invalid follow-up status');
  }
  
  if (data.note && data.note.length > 1000) {
    errors.push('Note must be less than 1000 characters');
  }
  
  if (data.supervisorComment && data.supervisorComment.length > 1000) {
    errors.push('Supervisor comment must be less than 1000 characters');
  }
  
  const validCallStatuses = ['called', 'not-reached', 'busy', 'voicemail', 'scheduled'];
  if (data.callStatus && !validCallStatuses.includes(data.callStatus)) {
    errors.push('Invalid call status');
  }
  
  return errors.length > 0 ? { success: false, errors } : { success: true };
}