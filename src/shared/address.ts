export type AddressParts = {
  address: string;
  city: string;
  state: string;
  zipCode: string;
};
export function parseAddress(value: string): AddressParts {
  const address = value.trim().replace(/\s+/g, ' ');
  if (address.length > 300) throw new Error('Address is too long.');
  const match = /^(.+),\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/.exec(
    address,
  );
  if (!match || !match[1].trim() || !match[2].trim())
    throw new Error(
      'Use Street address, City, ST ZIP, for example 123 Oak Street, Austin, TX 78701.',
    );
  return {
    address: match[1].trim(),
    city: match[2].trim(),
    state: match[3].toUpperCase(),
    zipCode: match[4],
  };
}
