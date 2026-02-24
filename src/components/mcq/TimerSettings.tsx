
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Infinity } from 'lucide-react';

interface TimerSettingsProps {
  timerEnabled: boolean;
  timePerQuestion: number;
  onTimerToggle: (enabled: boolean) => void;
  onTimeChange: (seconds: number) => void;
}

export const TimerSettings = ({ 
  timerEnabled, 
  timePerQuestion, 
  onTimerToggle, 
  onTimeChange 
}: TimerSettingsProps) => {
  const timeOptions = [
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 45, label: '45 seconds' },
    { value: 60, label: '1 minute' },
    { value: 90, label: '1.5 minutes' },
    { value: 120, label: '2 minutes' },
  ];

  return (
    <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
          <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span>Timer Settings</span>
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Configure time limits for your practice session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              Enable Timer
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add time pressure to your practice
            </p>
          </div>
          <Switch
            checked={timerEnabled}
            onCheckedChange={onTimerToggle}
          />
        </div>

        {timerEnabled && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">
              Time per Question
            </Label>
            <Select
              value={timePerQuestion.toString()}
              onValueChange={(value) => onTimeChange(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!timerEnabled && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Infinity className="w-4 h-4" />
            <span>No time limit - practice at your own pace</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
