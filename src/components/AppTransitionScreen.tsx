import BrandedLoader from '@/components/BrandedLoader';

type AppTransitionScreenProps = {
  label?: string;
  variant?: 'dark' | 'light' | 'auto';
  timeoutMs?: number;
};

const AppTransitionScreen = ({
  label = 'Loading',
  variant = 'auto',
  timeoutMs = 15000,
}: AppTransitionScreenProps) => {
  return <BrandedLoader label={label} variant={variant} timeoutMs={timeoutMs} />;
};

export default AppTransitionScreen;
