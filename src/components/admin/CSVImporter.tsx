import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  errors: string[];
  total: number;
  sheetResults: { [sheetName: string]: { success: number; total: number; errors: string[] } };
}

interface SubjectTopicMap {
  [subject: string]: { id: number; name: string }[];
}

export const CSVImporter = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [subjectTopics, setSubjectTopics] = useState<SubjectTopicMap>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchSubjectTopics = async () => {
      console.log("Fetching subjects and topics from Supabase...");
      const { data, error } = await supabase
        .from('chapters')
        .select('id, name, subjects(name)');

      if (error) {
        console.error('Error fetching subjects and topics:', error);
        toast({
          title: 'Database Error',
          description: 'Failed to load subjects and topics.',
          variant: 'destructive',
        });
        return;
      }

      const newSubjectTopics: SubjectTopicMap = {};
      data.forEach((chapter: any) => {
        const subjectName = chapter.subjects.name;
        const topic = { id: chapter.id, name: chapter.name };

        if (!newSubjectTopics[subjectName]) {
          newSubjectTopics[subjectName] = [];
        }
        newSubjectTopics[subjectName].push(topic);
      });

      setSubjectTopics(newSubjectTopics);
      console.log("Subjects and topics loaded:", newSubjectTopics);
    };

    fetchSubjectTopics();
  }, [toast]);

  // state to hold mapping sheet -> selected topic
  const [sheetTopicMapping, setSheetTopicMapping] = useState<{ [sheetName: string]: string }>({});

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'text/csv' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx') || file.name.endsWith('.csv'))) {
      setSelectedFile(file);
      setImportResult(null);
      setSheetTopicMapping({});
      parseFileForPreview(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a CSV or Excel (.xlsx) file",
        variant: "destructive",
      });
    }
  };

  const parseFileForPreview = async (file: File) => {
    try {
      let sheets: { [key: string]: any[][] } = {};

      if (file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        });
      } else {
        const csvText = await file.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        let currentSheet = 'Sheet 1';
        let currentSheetLines: string[] = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cells = parseCSVLine(line);
          const firstCell = cells[0] || '';
          if (firstCell && !firstCell.match(/^\d+$/) && firstCell !== 'Question' && firstCell !== '' && firstCell !== 'Sr.' && !firstCell.toLowerCase().includes('option')) {
            if (currentSheetLines.length > 0) {
              sheets[currentSheet] = currentSheetLines.map(line => parseCSVLine(line));
            }
            currentSheet = firstCell;
            currentSheetLines = [];
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1];
              const nextCells = parseCSVLine(nextLine);
              if (nextCells[1] && nextCells[1].toLowerCase().includes('question')) {
                i++;
              }
            }
          } else {
            currentSheetLines.push(line);
          }
        }
        if (currentSheetLines.length > 0) {
          sheets[currentSheet] = currentSheetLines.map(line => parseCSVLine(line));
        }
      }

      const preview = Object.keys(sheets).map(sheetName => {
        const sheetData = sheets[sheetName];
        let questionCount = 0;
        let errors: string[] = [];
        for (let i = 2; i < sheetData.length; i++) {
          const row = sheetData[i];
          const serialNum = row[0] ? String(row[0]).trim() : '';
          const question = row[1] ? String(row[1]).trim() : '';
          const optionA = row[2] ? String(row[2]).trim() : '';
          const optionB = row[3] ? String(row[3]).trim() : '';
          // Option C..E optional, only require A & B for minimal validation
          if (serialNum && serialNum.match(/^\d+$/) && question && optionA && optionB) {
            questionCount++;
          } else {
            const rowNumber = i + 1;
            const errorReason = `Row ${rowNumber}: Missing data in required columns (Serial, Question, Option A, or Option B).`;
            errors.push(errorReason);
          }
        }
        return {
          sheet: sheetName,
          questionCount: questionCount,
          errors: errors
        };
      });
      setPreviewData(preview);

      const totalErrors = preview.reduce((sum, sheet) => sum + sheet.errors.length, 0);
      if (totalErrors > 0) {
        toast({
          title: "File Validation Alert",
          description: `Found ${totalErrors} potential issues in your file. Please check the preview table for details.`,
          variant: "warning",
        });
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Preview Error",
        description: "Could not preview the file",
        variant: "destructive",
      });
    }
  };

  const importQuestions = async () => {
    if (!selectedFile || !selectedSubject) {
      toast({
        title: "Missing Information",
        description: "Please select a file and subject",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    const result: ImportResult = { success: 0, errors: [], total: 0, sheetResults: {} };

    try {
      const sheets = await parseFile(selectedFile);

      for (const [sheetName, questions] of Object.entries(sheets)) {
        const selectedTopicName = sheetTopicMapping[sheetName];

        if (!selectedTopicName) {
          const error = `No topic selected for sheet "${sheetName}". Skipping.`;
          console.error(error);
          result.errors.push(error);
          result.sheetResults[sheetName] = { success: 0, total: questions.length, errors: [error] };
          continue;
        }

        const chapter = subjectTopics[selectedSubject]?.find(t => t.name === selectedTopicName);

        if (!chapter) {
          const error = `Selected topic "${selectedTopicName}" not found for subject "${selectedSubject}". Skipping.`;
          console.error(error);
          result.errors.push(error);
          result.sheetResults[sheetName] = { success: 0, total: questions.length, errors: [error] };
          continue;
        }

        const sheetResult = { success: 0, total: questions.length, errors: [] };
        result.sheetResults[sheetName] = sheetResult;
        result.total += questions.length;

        for (const q of questions) {
          try {
            const { error } = await supabase
              .from('mcqs')
              .insert({
                chapter_id: chapter.id,
                question: q.question,
                options: [q.optionA, q.optionB, q.optionC, q.optionD, q.optionE],
                correct_answer: q.answer,
                explanation: q.explanation,
                subject: selectedSubject,
                difficulty: 'medium'
              });

            if (error) {
              const errorMessage = `Failed to import question with serial ${q.serial} on sheet "${sheetName}". Reason: ${error.message}`;
              throw new Error(errorMessage);
            }
            result.success++;
            sheetResult.success++;
          } catch (error: any) {
            const errorMsg = `Question with serial ${q.serial} on sheet "${sheetName}": ${error.message}`;
            result.errors.push(errorMsg);
            sheetResult.errors.push(errorMsg);
          }
        }
      }

      setImportResult(result);
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} out of ${result.total} questions`,
      });

    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || String(error),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleTopicSelect = (sheetName: string, topicName: string) => {
    setSheetTopicMapping(prev => ({
      ...prev,
      [sheetName]: topicName
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-6 h-6" />
            <span>Excel/CSV Question Importer</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file">Select Excel (.xlsx) or CSV File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
            />
            {selectedFile && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <FileText className="w-4 h-4" />
                <span>{selectedFile.name}</span>
              </div>
            )}
          </div>

          {/* Subject Selection */}
          <div className="space-y-2">
            <Label>Select Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(subjectTopics).map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Topic Selection per Sheet */}
          {previewData.length > 0 && selectedSubject && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">Map Sheets to Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sheet/Topic Name</TableHead>
                      <TableHead>Questions Found</TableHead>
                      <TableHead>Questions with Issues</TableHead>
                      <TableHead>Select Destination Topic</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((sheet, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{sheet.sheet}</TableCell>
                        <TableCell>{sheet.questionCount}</TableCell>
                        <TableCell className={sheet.errors.length > 0 ? "text-red-600" : ""}>{sheet.errors.length}</TableCell>
                        <TableCell>
                          <Select
                            value={sheetTopicMapping[sheet.sheet] || ''}
                            onValueChange={(value) => handleTopicSelect(sheet.sheet, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Topic" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjectTopics[selectedSubject]?.map(topic => (
                                <SelectItem key={topic.id} value={topic.name}>
                                  {topic.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {previewData.some(sheet => sheet.errors.length > 0) && (
                  <div className="mt-4 space-y-2 text-sm">
                    <h4 className="font-semibold text-red-600">Detailed Preview Errors:</h4>
                    {previewData.filter(sheet => sheet.errors.length > 0).map((sheet, index) => (
                      <div key={index} className="p-2 border rounded-md">
                        <p className="font-medium">{sheet.sheet}:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {sheet.errors.map((error: string, errorIndex: number) => (
                            <li key={errorIndex} className="text-red-500">{error}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Import Button */}
          <Button
            onClick={importQuestions}
            disabled={!selectedFile || !selectedSubject || isImporting || Object.keys(sheetTopicMapping).length === 0}
            className="w-full"
          >
            {isImporting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Importing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Import All Sheets</span>
              </div>
            )}
          </Button>


          {/* Import Results */}
          {importResult && (
            <Card className="mt-4">
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-600 font-medium">
                      Overall: {importResult.success}/{importResult.total} questions imported
                    </span>
                  </div>

                  {/* Sheet-by-sheet results */}
                  {Object.keys(importResult.sheetResults).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Sheet Results:</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sheet Name</TableHead>
                            <TableHead>Success</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(importResult.sheetResults).map(([sheetName, res]) => (
                            <TableRow key={sheetName}>
                              <TableCell className="font-medium">{sheetName}</TableCell>
                              <TableCell>{res.success}</TableCell>
                              <TableCell>{res.total}</TableCell>
                              <TableCell>
                                {res.success === res.total ? (
                                  <span className="text-green-600">✓ Complete</span>
                                ) : (
                                  <span className="text-yellow-600">⚠ Partial</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-600 font-medium">Errors:</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto text-sm text-red-600">
                        {importResult.errors.map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <h4 className="font-semibold text-blue-900 mb-2">File Format Instructions:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Excel (.xlsx):</strong> Each sheet should represent a topic/chapter</p>
                <p><strong>CSV:</strong> Use topic names as section headers to separate different topics</p>
                <p>• Questions should start from row 3 in each sheet</p>
                <p>• Column A: Serial number, Column B: Question text</p>
                <p>• Columns C, D, E, F, G: Option A, B, C, D, E respectively (Option E is optional)</p>
                <p>• Column H: Correct answer (A, B, C, D, or E)</p>
                <p>• Column I: Explanation (optional)</p>
                <p>• Sheet/topic names must match the topics in your selected subject</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * parseFile
 * - Reads .xlsx or .csv and returns a mapping sheetName => questions[]
 * - Expected columns:
 *   0: Serial, 1: Question, 2: OptionA, 3: OptionB, 4: OptionC, 5: OptionD, 6: OptionE, 7: Answer, 8: Explanation
 */
const parseFile = async (file: File): Promise<{ [key: string]: any[] }> => {
  let sheets: { [key: string]: any[][] } = {};

  if (file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    });
  } else {
    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    let currentSheet = 'Sheet 1';
    let currentSheetLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cells = parseCSVLine(line);
      const firstCell = cells[0] || '';
      if (firstCell && !firstCell.match(/^\d+$/) && firstCell !== 'Question' && firstCell !== '' && firstCell !== 'Sr.' && !firstCell.toLowerCase().includes('option')) {
        if (currentSheetLines.length > 0) {
          sheets[currentSheet] = currentSheetLines.map(line => parseCSVLine(line));
        }
        currentSheet = firstCell;
        currentSheetLines = [];
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const nextCells = parseCSVLine(nextLine);
          if (nextCells[1] && nextCells[1].toLowerCase().includes('question')) {
            i++;
          }
        }
      } else {
        currentSheetLines.push(line);
      }
    }
    if (currentSheetLines.length > 0) {
      sheets[currentSheet] = currentSheetLines.map(line => parseCSVLine(line));
    }
  }

  const result: { [key: string]: any[] } = {};
  Object.entries(sheets).forEach(([sheetName, sheetData]) => {
    const questions: any[] = [];
    for (let i = 2; i < sheetData.length; i++) {
      const row = sheetData[i];
      const serialNum = row[0] ? String(row[0]).trim() : '';
      const question = row[1] ? String(row[1]).trim() : '';
      const optionA = row[2] ? String(row[2]).trim() : '';
      const optionB = row[3] ? String(row[3]).trim() : '';
      const optionC = row[4] ? String(row[4]).trim() : '';
      const optionD = row[5] ? String(row[5]).trim() : '';
      const optionE = row[6] ? String(row[6]).trim() : '';
      const answer = row[7] ? String(row[7]).trim() : '';
      const explanation = row[8] ? String(row[8]).trim() : '';
      if (serialNum && serialNum.match(/^\d+$/) && question && optionA && optionB) {
        questions.push({
          serial: serialNum,
          question: question,
          optionA: optionA,
          optionB: optionB,
          optionC: optionC,
          optionD: optionD,
          optionE: optionE,
          answer: answer,
          explanation: explanation
        });
      }
    }
    result[sheetName] = questions;
  });
  return result;
};

/**
 * parseCSVLine
 * simple CSV line parser that respects double quotes
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // toggle inQuotes, but handle escaped quotes ("")
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};
