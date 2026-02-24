// src/components/QuestionMapDrawer.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { PanelLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MCQMapItem {
    id: string;
    isAnswered: boolean;
}

interface QuestionMapDrawerProps {
    questions: MCQMapItem[];
    currentQuestionIndex: number;
    goToQuestion: (index: number) => void;
    isDrawerOpen: boolean;
    setIsDrawerOpen: (isOpen: boolean) => void;
}

export const QuestionMapDrawer = ({
    questions,
    currentQuestionIndex,
    goToQuestion,
    isDrawerOpen,
    setIsDrawerOpen,
}: QuestionMapDrawerProps) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <>
            {/* Mobile View: Sheet Drawer */}
            <div className="lg:hidden">
                <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <PanelLeft className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side="left"
                        className="w-[250px] sm:w-[300px] bg-white dark:bg-gray-900 border-r border-purple-200 dark:border-purple-800 p-4 flex flex-col"
                    >
                        <SheetHeader>
                            <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                Question Map
                            </SheetTitle>
                        </SheetHeader>
                        <div className="flex-grow overflow-y-auto pr-2">
                            <div className="grid grid-cols-4 gap-2">
                                {questions.map((question, index) => (
                                    <Button
                                        key={question.id}
                                        variant={question.isAnswered ? "default" : "outline"}
                                        className={`w-full ${currentQuestionIndex === index
                                                ? "bg-purple-600 hover:bg-purple-700 text-white"
                                                : question.isAnswered
                                                    ? "bg-green-500 hover:bg-green-600 text-white"
                                                    : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            }`}
                                        onClick={() => goToQuestion(index)}
                                    >
                                        {index + 1}
                                    </Button>
                                ))}
                            </div>
                            <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                                <p className="mb-2">
                                    <span className="inline-block w-4 h-4 rounded-full bg-purple-600 mr-2"></span>
                                    Current Question
                                </p>
                                <p className="mb-2">
                                    <span className="inline-block w-4 h-4 rounded-full bg-green-500 mr-2"></span>
                                    Answered
                                </p>
                                <p>
                                    <span className="inline-block w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-700 mr-2"></span>
                                    Unanswered
                                </p>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop View: Fixed Collapsible Drawer */}
            <div className="hidden lg:block">
                <AnimatePresence initial={false}>
                    {!collapsed && (
                        <motion.div
                            key="drawer"
                            initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed top-0 left-0 h-full w-[280px] bg-white dark:bg-gray-900 border-r border-purple-200 dark:border-purple-800 shadow-lg flex flex-col z-40"
                        >
                            <div className="p-4 border-b border-purple-200 dark:border-purple-800 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Question Map
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCollapsed(true)}
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-grow overflow-y-auto p-4">
                                <div className="grid grid-cols-4 gap-2">
                                    {questions.map((question, index) => (
                                        <motion.button
                                            key={question.id}
                                            onClick={() => goToQuestion(index)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`w-full h-10 rounded-md text-sm font-medium transition-all ${currentQuestionIndex === index
                                                    ? "bg-purple-600 text-white"
                                                    : question.isAnswered
                                                        ? "bg-green-500 text-white"
                                                        : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                                }`}
                                        >
                                            {index + 1}
                                        </motion.button>
                                    ))}
                                </div>

                                <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                                    <p className="mb-2">
                                        <span className="inline-block w-4 h-4 rounded-full bg-purple-600 mr-2"></span>
                                        Current Question
                                    </p>
                                    <p className="mb-2">
                                        <span className="inline-block w-4 h-4 rounded-full bg-green-500 mr-2"></span>
                                        Answered
                                    </p>
                                    <p>
                                        <span className="inline-block w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-700 mr-2"></span>
                                        Unanswered
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Collapse Button (when hidden) */}
                {collapsed && (
                    <motion.div
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -50, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed top-1/2 left-0 transform -translate-y-1/2 z-50"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCollapsed(false)}
                            className="rounded-r-lg bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 shadow-md"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </motion.div>
                )}
            </div>
        </>
    );
};
