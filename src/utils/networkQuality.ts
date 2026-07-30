type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

export const isConstrainedConnection = () => {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as Navigator & {
    connection?: NetworkInformationLike;
  }).connection;
  return connection?.saveData === true
    || connection?.effectiveType === 'slow-2g'
    || connection?.effectiveType === '2g';
};
