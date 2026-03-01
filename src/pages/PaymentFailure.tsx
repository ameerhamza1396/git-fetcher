import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, RefreshCcw, MessageCircle, AlertCircle, ArrowLeft, ReceiptText } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Seo from '@/components/Seo';

const PaymentFailure = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Extracting data from the URL payload
    const errorMessage = searchParams.get('err_msg');
    const errorCode = searchParams.get('err_code');
    const basketId = searchParams.get('basket_id');

    // Fallback message as requested
    const displayError = errorMessage
        ? decodeURIComponent(errorMessage)
        : "Something fumbled, we are already clearing this mess";

    return (
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <Seo title="Payment Failed | Medmacs" description="There was an issue processing your transaction." />

            <div className="max-w-md w-full space-y-8 text-center">
                {/* Error Icon Animation */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-red-100 dark:bg-red-900/20 animate-ping scale-150 opacity-25" />
                        <div className="relative bg-white dark:bg-slate-900 rounded-full p-4 shadow-xl">
                            <XCircle className="h-16 w-16 text-red-500" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                        Payment Failed
                    </h1>
                    {/* Displaying the dynamic error from payload */}
                    <p className="text-red-600 dark:text-red-400 font-medium px-4">
                        {displayError}
                    </p>
                </div>

                <Card className="border-red-100 dark:border-red-900/50 shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center justify-center gap-2 uppercase tracking-wider">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            Transaction Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-left space-y-3">
                        <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2 text-xs font-mono">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Error Code:</span>
                                <span className="text-slate-900 dark:text-slate-200">{errorCode || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Order ID:</span>
                                <span className="text-slate-900 dark:text-slate-200">{basketId || 'N/A'}</span>
                            </div>
                        </div>

                        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 pt-2">
                            <li className="flex gap-2">
                                <span className="text-red-500 font-bold">•</span>
                                Check for insufficient balance or credit limits.
                            </li>
                            <li className="flex gap-2">
                                <span className="text-red-500 font-bold">•</span>
                                Ensure 3D Secure (OTP) was entered correctly.
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => navigate('/pricing')}
                        className="w-full h-12 bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 font-bold text-lg transition-all"
                    >
                        <RefreshCcw className="mr-2 h-5 w-5" />
                        Try Again
                    </Button>

                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" asChild className="h-11">
                            <Link to="/dashboard">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Home
                            </Link>
                        </Button>
                        <Button onClick={() => navigate('/contact-us')}
                            variant="outline" className="h-11 border-purple-200 dark:border-purple-900 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                            <MessageCircle className="mr-2 h-4 w-4 text-purple-600" />
                            Support
                        </Button>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground pt-4">
                    Reference ID: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
                        {basketId ? `REF-${basketId.slice(-6)}` : `ERR-${Date.now().toString().slice(-6)}`}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default PaymentFailure;