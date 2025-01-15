const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Common email providers
const commonEmailDomains = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'icloud.com',
  'protonmail.com',
  'mail.com',
];

// Suspicious or temporary email providers
const suspiciousEmailDomains = [
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
];

export const validateEmail = (email) => {
  // Basic format check
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: 'Invalid email format',
    };
  }

  // Extract domain
  const domain = email.split('@')[1].toLowerCase();

  // Check for temporary/disposable email services
  if (suspiciousEmailDomains.includes(domain)) {
    return {
      isValid: false,
      message: 'Please use a permanent email address',
    };
  }

  // Warning for uncommon domains
  if (!commonEmailDomains.includes(domain)) {
    return {
      isValid: true,
      warning: 'Please verify this email address is correct',
    };
  }

  return {
    isValid: true,
  };
};
