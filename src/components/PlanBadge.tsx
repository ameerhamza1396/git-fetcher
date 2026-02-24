import { Badge } from '@/components/ui/badge';

export type PlanBadgeProps = {
    plan: string | undefined;
    className?: string;
};

const PlanBadge = ({ plan, className = '' }: PlanBadgeProps) => {
    const planColors: Record<string, string> = {
        'free': 'bg-primary/10 text-primary border-primary/20',
        'premium': 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700',
        'iconic': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700',
        'default': 'bg-muted text-muted-foreground border-border',
    };

    const rawUserPlan = plan?.toLowerCase() || 'Loading';
    const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
    const colorClass = planColors[rawUserPlan] || planColors['default'];

    return (
        <Badge variant="secondary" className={`${colorClass} ${className}`}>
            {userPlanDisplayName}
        </Badge>
    );
};

export default PlanBadge;