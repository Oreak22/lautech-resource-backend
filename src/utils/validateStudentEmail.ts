export const isStudentEmail = (email: string): boolean => {
  const cleanEmail = email.toLowerCase().trim();

  // Example rule: Must end with standard student domain variants
  // Adjust 'lautech.edu.ng' or student portal extensions as required by the institution
  const validDomains = ["lautech.edu.ng", "student.lautech.edu.ng"];
  const domain = cleanEmail.split("@")[1];

  if (!domain) return false;

  // Check if it belongs to the allowed school domains
  const isValidDomain = validDomains.some(
    (d) => domain === d || domain.endsWith("." + d),
  );

  return isValidDomain;
};
