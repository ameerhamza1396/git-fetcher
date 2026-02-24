import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

interface UpgradeAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgradeClick: () => void;
}

const UpgradeAccountModal: React.FC<UpgradeAccountModalProps> = ({ isOpen, onClose, onUpgradeClick }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] p-6 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-purple-200 dark:border-purple-800">
                <DialogHeader className="text-center">
                    <Crown className="w-12 h-12 mx-auto text-yellow-500 dark:text-yellow-400 mb-3" />
                    <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Upgrade Your Account</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
                        Full-Length Papers are exclusive to Premium users. Upgrade for unlimited access!
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="w-full sm:w-auto border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    >
                        Maybe Later
                    </Button>
                    <Button
                        onClick={onUpgradeClick}
                        className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
                    >
                        Upgrade Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UpgradeAccountModal;
