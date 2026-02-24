import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AppExitConfirmationProps {
    showExitConfirm: boolean;
    setShowExitConfirm: (show: boolean) => void;
}

const AppExitConfirmation = ({ showExitConfirm, setShowExitConfirm }: AppExitConfirmationProps) => {
    const [capacitorAvailable, setCapacitorAvailable] = useState(false);

    useEffect(() => {
        // Check if we're in a Capacitor environment
        const isCapacitorAvailable = typeof window !== 'undefined' &&
            (window as any).Capacitor &&
            (window as any).Capacitor.isNative;

        setCapacitorAvailable(isCapacitorAvailable);

        if (isCapacitorAvailable) {
            // Load Capacitor App module dynamically
            import('@capacitor/app').then(({ App }) => {
                const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
                    // Only show exit confirm on dashboard
                    if (window.location.pathname === '/dashboard') {
                        setShowExitConfirm(true);
                    }
                });

                return () => {
                    backButtonListener.remove();
                };
            }).catch(console.error);
        }
    }, [setShowExitConfirm]);

    const handleExitConfirm = () => {
        setShowExitConfirm(false);
        // Exit the app if Capacitor is available
        if (capacitorAvailable) {
            import('@capacitor/app').then(({ App }) => {
                App.exitApp();
            }).catch(console.error);
        }
    };

    const handleExitCancel = () => {
        setShowExitConfirm(false);
    };

    // Only render the component if Capacitor is available or showExitConfirm is true
    if (!capacitorAvailable && !showExitConfirm) {
        return null;
    }

    return (
        <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-xl">🚪</span>
                        Exit Medmacs?
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to exit the app? Your progress will be saved automatically.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-row gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleExitCancel}
                        className="flex-1 sm:flex-none"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleExitConfirm}
                        className="flex-1 sm:flex-none"
                    >
                        Exit App
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AppExitConfirmation;