// Default to IN for development, will be overridden by IP detection
export function getUserCountry(): string {
  if (typeof window === 'undefined') return 'IN'; // Default to India for SSR
  
  // Check if we've already detected the country
  const storedCountry = localStorage.getItem('userCountry');
  if (storedCountry) return storedCountry;
  
  return 'IN'; // Default to India
}

export async function detectUserCountry(): Promise<string> {
  try {
    if (typeof window === 'undefined') return 'IN';
    
    // Try to get from localStorage first
    const storedCountry = localStorage.getItem('userCountry');
    if (storedCountry) return storedCountry;
    
    // If not in localStorage, detect from IP
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('Failed to detect country');
    
    const data = await response.json();
    const countryCode = data.country_code || 'IN';
    
    // Store in localStorage for future use
    localStorage.setItem('userCountry', countryCode);
    
    return countryCode;
  } catch (error) {
    console.error('Error detecting country:', error);
    return 'IN'; // Default to India on error
  }
}
