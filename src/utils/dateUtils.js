// Date utility functions for business day calculations

/**
 * Calculate the number of business days between two dates
 * Excludes weekends (Saturday and Sunday)
 * Can be extended to exclude public holidays
 */
export const calculateBusinessDays = (startDate, endDate, excludeHolidays = []) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Ensure start date is before end date
  if (start > end) {
    return 0;
  }
  
  let businessDays = 0;
  const currentDate = new Date(start);
  
  // Convert holiday dates to comparable format
  const holidays = excludeHolidays.map(holiday => {
    const date = new Date(holiday);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const currentDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    
    // Check if it's a weekday (Monday = 1, Friday = 5)
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    // Check if it's not a holiday
    const isNotHoliday = !holidays.includes(currentDateString);
    
    if (isWeekday && isNotHoliday) {
      businessDays++;
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return businessDays;
};

/**
 * Common public holidays (can be customized per region)
 * These are example holidays - you should customize this for your region
 */
export const getCommonHolidays = (year) => {
  return [
    // New Year's Day
    `${year}-01-01`,
    
    // Example: Christmas Day
    `${year}-12-25`,
    
    // Example: Christmas Eve (if observed)
    `${year}-12-24`,
    
    // Add more holidays as needed for your region
    // Easter dates would need to be calculated dynamically
    // National holidays, etc.
  ];
};

/**
 * Calculate project cost based on business days
 */
export const calculateProjectCost = (startDate, endDate, teamSize, hourlyRate = 150, hoursPerDay = 4, excludeHolidays = []) => {
  if (!startDate || !endDate || !teamSize) {
    return 0;
  }
  
  const businessDays = calculateBusinessDays(startDate, endDate, excludeHolidays);
  return teamSize * hoursPerDay * businessDays * hourlyRate;
};

/**
 * Get a human-readable description of the business days calculation
 */
export const getBusinessDaysDescription = (startDate, endDate, excludeHolidays = []) => {
  const businessDays = calculateBusinessDays(startDate, endDate, excludeHolidays);
  const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
  const weekendDays = totalDays - businessDays - excludeHolidays.length;
  
  return {
    businessDays,
    totalDays,
    weekendDays,
    holidays: excludeHolidays.length,
    description: `${businessDays} business days (excluding ${weekendDays} weekend days${excludeHolidays.length > 0 ? ` and ${excludeHolidays.length} holidays` : ''})`
  };
};

/**
 * Format business days for display
 */
export const formatBusinessDays = (businessDays) => {
  if (businessDays === 1) {
    return '1 business day';
  }
  return `${businessDays} business days`;
};

/**
 * Calculate working weeks from business days
 */
export const businessDaysToWeeks = (businessDays) => {
  return Math.round((businessDays / 5) * 10) / 10; // 5 business days per week, rounded to 1 decimal
};

/**
 * Estimate project duration in a human-readable format
 */
export const formatProjectDuration = (startDate, endDate, excludeHolidays = []) => {
  const businessDays = calculateBusinessDays(startDate, endDate, excludeHolidays);
  const weeks = businessDaysToWeeks(businessDays);
  
  if (weeks < 1) {
    return formatBusinessDays(businessDays);
  } else if (weeks < 2) {
    return `${weeks} week (${formatBusinessDays(businessDays)})`;
  } else {
    return `${weeks} weeks (${formatBusinessDays(businessDays)})`;
  }
};