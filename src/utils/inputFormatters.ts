/**
 * Strips leading zeros from a numeric string, keeping a single '0' if the value is zero.
 */
export const stripLeadingZeros = (val: string): string => {
  // Strip non-numeric/decimal characters first
  let clean = val.replace(/[^\d.]/g, '');
  
  // Handle multiple decimal points (keep only the first one)
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('');
  }
  
  const [integerPart, decimalPart] = clean.split('.');
  
  // Strip leading zeros from the integer part, preserving a single "0" if it's "0"
  const formattedInt = integerPart.replace(/^0+(?!$)/, '');
  
  if (decimalPart !== undefined) {
    return formattedInt + '.' + decimalPart;
  }
  return formattedInt;
};

/**
 * Formats a numeric string with thousands separators (commas) and strips leading zeros.
 */
export const formatMoneyInput = (val: string | number): string => {
  const cleanStr = stripLeadingZeros(val.toString());
  const [integerPart, decimalPart] = cleanStr.split('.');
  
  // Add commas to integer part
  const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  if (decimalPart !== undefined) {
    return formattedInt + '.' + decimalPart;
  }
  return formattedInt;
};

/**
 * Standardizes a string back to a clean numeric float, removing commas.
 */
export const parseFormattedNumber = (val: string | number): number => {
  const clean = val.toString().replace(/,/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};
