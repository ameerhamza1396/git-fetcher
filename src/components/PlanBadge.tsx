import { Badge } from '@/components/ui/badge';

export type PlanBadgeProps = {
    plan: string | undefined;
    className?: string;
};

const PlanBadge = ({ plan, className = '' }: PlanBadgeProps) => {
    // Define plan color schemes
    const planColors: Record<string, { light: string; dark: string }> = {
        'free': {
            light: 'bg-purple-100 text-purple-800 border-purple-300',
            dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
        },
        'premium': {
            light: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
        },
        'iconic': {
            light: 'bg-green-100 text-green-800 border-green-300',
            dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
        },
        'default': {
            light: 'bg-gray-100 text-gray-800 border-gray-300',
            dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
        }
    };

    const rawUserPlan = plan?.toLowerCase() || 'Loading';
    const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
    const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];

    return (
        <Badge
      variant= "secondary"
    className = {`${currentPlanColorClasses.light} ${currentPlanColorClasses.dark} ${className}`
}
    >
    { userPlanDisplayName }
    </Badge>
  );
};

export default PlanBadge;